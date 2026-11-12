
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as path from 'path';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AghmNwpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const amplifyRole = new iam.Role(this, 'AmplifyServiceRole', {
      assumedBy: new iam.ServicePrincipal('amplify.amazonaws.com'),
      description: 'Service role used by AWS Amplify to run builds',
    });

    amplifyRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess-Amplify')
    );


    // 1. BACKEND: AWS Lambda Functions
    const vpc = ec2.Vpc.fromLookup(this, 'EngineVpc', {
      vpcId: 'vpc-06f55cc32200b2717',
    });
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'EngineLambdaSecurityGroup', {
      vpc,
      description: 'Network access for the recommendation engine Lambda',
      allowAllOutbound: true,
    });
    const databaseSecurityGroup = ec2.SecurityGroup.fromSecurityGroupId(
      this,
      'EngineDatabaseSecurityGroup',
      'sg-08314c5a76cbd8cb0',
    );
    databaseSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(5432),
      'Allow the recommendation Lambda to connect to PostgreSQL',
    );

    const databaseSecret = secretsmanager.Secret.fromSecretNameV2(
      this,
      'EngineDatabaseSecret',
      'aghm-nwp/database',
    );
    const repositoryRoot = path.join(__dirname, '..');
    const engineLambda = new lambdaNodejs.NodejsFunction(this, 'EngineFunction', {
      entry: path.join(repositoryRoot, 'backend', 'src', 'types', 'engine', 'lambda-handler.js'),
      projectRoot: repositoryRoot,
      depsLockFilePath: path.join(repositoryRoot, 'package-lock.json'),
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'lambda-handler.handler',
      timeout: cdk.Duration.seconds(30),
      memorySize: 512,
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      securityGroups: [lambdaSecurityGroup],
      environment: {
        DATABASE_SECRET_ARN: databaseSecret.secretArn,
        DB_SSL: 'true',
      },
      bundling: {
        loader: { '.pem': 'text' },
      },
    });
    databaseSecret.grantRead(engineLambda);


    // 1a. BACKEND: API Gateway routes requests to the active engine handler.

    const httpApi = new apigwv2.HttpApi(this, 'NwpHttpApi', {
      apiName: 'NWP Engine API',
      corsPreflight: {
       allowOrigins: ['*'], // TODO: tighten to the Amplify domain once known
       allowMethods: [apigwv2.CorsHttpMethod.POST],
       allowHeaders: ['Content-Type'],
      },
    });

    const engineIntegration = new HttpLambdaIntegration(
      'EngineIntegration',
      engineLambda,
    );

    httpApi.addRoutes({
      path: '/generate',
      methods: [apigwv2.HttpMethod.POST],
      integration: engineIntegration,
    });


    // 1b. BACKEND: EventBridge schedule (triggers pricingUpdateLambda)

    // Depends on pricingUpdateLambda above — stays disabled until that's active.
    // TODO: cadence still unresolved — FR doc says "weekly", team discussion
    // said "daily 2am". Confirm actual cadence before uncommenting; the
    // schedule expression below is a placeholder (daily 2am UTC) only.

    // const pricingUpdateRule = new events.Rule(this, 'PricingUpdateSchedule', {
    //   schedule: events.Schedule.cron({ minute: '0', hour: '2' }),
    // });

    // pricingUpdateRule.addTarget(new targets.LambdaFunction(pricingUpdateLambda));


    // 2. FRONTEND: Amplify Hosting

    // .unsafeUnwrap() safely converts the CDK SecretValue object
    // into a plain string that CloudFormation can resolve during deployment.
    const githubToken = cdk
      .SecretValue
      .secretsManager('github-oauth-token')
      .unsafeUnwrap();

    // Amplify build configuration for the Vite React frontend.
    const buildSpecYaml = `
version: 1.0
applications:
  - appRoot: frontend
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: dist
        files:
          - '**/*'
`;

    const amplifyApp = new amplify.CfnApp(this, 'MonorepoAmplifyApp', {
      name: 'Capstone Project',
      repository: 'https://github.com/kriztiangerard/aghm-nwp',
      oauthToken: githubToken,
      buildSpec: buildSpecYaml,
      iamServiceRole: amplifyRole.roleArn,


      // For fixing client-side routing
      customRules: [
        {
          source:
            '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>',
          target: '/index.html',
          status: '200',
        },
      ],
    });

    // Connect the main branch so it triggers builds on push
    const mainBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'main',
      enableAutoBuild: true,
    });

    const developmentBranch = new amplify.CfnBranch(this, 'DevelopmentBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'development',
      enableAutoBuild: true,
    });


    // 3. OUTPUTS

    new cdk.CfnOutput(this, 'AmplifyAppUrl', {
      // .attrDefaultDomain fetches the auto-generated Amplify URL
      value: `https://${mainBranch.branchName}.${amplifyApp.attrDefaultDomain}`,
    });

    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: engineLambda.functionName,
    });

    /* new cdk.CfnOutput(this, 'PricingUpdateFunctionName', {
      value: pricingUpdateLambda.functionName,
    }); */

    // Re-enable alongside the API Gateway above once it's active.
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
    });
  }
}
