import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';
import * as apigwv2 from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';

export class AghmNwpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);


    // 1. BACKEND: AWS Lambda Functions

    // Disabled until backend/engine-bom/ and backend/pricing-update/ exist
    // with real handler code — cdk deploy will fail on Code.fromAsset()
    // pointing at folders that don't exist yet. Uncomment once both
    // subfolders have at least a placeholder index.handler.

    const engineLambda = new lambda.Function(this, 'EngineFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../backend/src/recommendation')),
      handler: 'index.handler',
     });

    const pricingUpdateLambda = new lambda.Function(this, 'PricingUpdateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../backend/src/pricing')),
      handler: 'index.handler',
    });


    // 1a. BACKEND: API Gateway (routes to engineLambda)
    // Depends on engineLambda above — stays disabled until that's active.

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
    // .unsafeUnwrap() safely converts the CDK SecretValue object into a plain string
    // that CloudFormation can resolve during deployment.

    const githubToken = cdk.SecretValue.secretsManager('github-oauth-token').unsafeUnwrap();

    // For L1 constructs, we define the buildSpec as a raw multi-line YAML string
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
        baseDirectory: build
        files:
          - '**/*'
      cache:
        paths:
          - node_modules/**/*
`;

    const amplifyApp = new amplify.CfnApp(this, 'MonorepoAmplifyApp', {
      name: 'Capstone Project',
      repository: 'https://github.com/kriztiangerard/aghm-nwp',
      oauthToken: githubToken,
      buildSpec: buildSpecYaml,

      // For fixing client-side routing
      customRules: [
        {
          source: '</^[^.]+$|\\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json)$)([^.]+$)/>',
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


    // 3. OUTPUTS


    new cdk.CfnOutput(this, 'AmplifyAppUrl', {
      // .attrDefaultDomain fetches the auto-generated amplifyapp.com URL
      value: `https://${mainBranch.branchName}.${amplifyApp.attrDefaultDomain}`,
    });

    // Re-enable alongside the Lambdas above once they're active.
    new cdk.CfnOutput(this, 'EngineFunctionName', {
      value: engineLambda.functionName,
    });

    new cdk.CfnOutput(this, 'PricingUpdateFunctionName', {
      value: pricingUpdateLambda.functionName,
    });

    // Re-enable alongside the API Gateway above once it's active.
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: httpApi.apiEndpoint,
    });
  }
}