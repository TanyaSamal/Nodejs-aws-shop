import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';
import * as dotenv from "dotenv";

dotenv.config();

export class AuthorizationServiceStack extends cdk.Stack {
  public readonly authorizerLambda: NodejsFunction;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.authorizerLambda = new NodejsFunction(this, 'AuthorizerLambda', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../lambdas/basicAuthorizer.ts'),
      handler: 'handler',
      environment: {
        USERNAME: 'TanyaSamal',
        PASSWORD: process.env.TanyaSamal || 'TEST_PASSWORD',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: ['aws-sdk'],
        forceDockerBundling: false,
      },
    });

    this.authorizerLambda.addPermission('ApiGatewayInvoke', {
      principal: new iam.ServicePrincipal('apigateway.amazonaws.com'),
      action: 'lambda:InvokeFunction',
    });

    new cdk.CfnOutput(this, 'AuthorizerLambdaArn', {
      value: this.authorizerLambda.functionArn,
      exportName: 'AuthorizerLambdaArn',
    });
  }
}
