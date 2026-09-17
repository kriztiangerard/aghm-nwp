import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class AghmNwpStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. BACKEND: AWS Lambda Functions
    const engineLambda = new lambda.Function(this, 'EngineFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../backend')),
      handler: 'hello-world.handler',
    });

    /* const updateLambda = new lambda.Function(this, 'UpdateFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../backend')),
      handler: 'hello-world.handler',
    });
    */

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
          status: '200'
        }
      ]
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
    
    new cdk.CfnOutput(this, 'LambdaFunctionName', {
      value: engineLambda.functionName,
    });
  }
}