import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import * as path from 'path';

const lambdaBundlingObject = {
  minify: true,
  sourceMap: true,
  target: 'es2020',
  externalModules: ['aws-sdk'],
  nodeModules: ['csv-parser'],
  forceDockerBundling: false,
};

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = s3.Bucket.fromBucketName(this, 'ImportBucket', 'rs-tatiana-import-bucket');

    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      'CatalogItemsQueue',
      'arn:aws:sqs:eu-north-1:762233769491:catalogItemsQueue'
    );

    const importProductsFile = new NodejsFunction(this, 'importProductsFileFunction', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../lambdas/importProductsFile.ts'),
      handler: 'handler',
      environment: {
        BUCKET_NAME: importBucket.bucketName,
        UPLOAD_FOLDER: 'uploaded',
      },
      bundling: lambdaBundlingObject,
    });

    importBucket.grantReadWrite(importProductsFile);

    const importFileParserFunction = new NodejsFunction(this, 'importFileParserFunction', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../lambdas/importFileParser.ts'),
      handler: 'handler',
      environment: {
        BUCKET_NAME: importBucket.bucketName,
        SQS_QUEUE_URL: catalogItemsQueue.queueUrl
      },
      bundling: lambdaBundlingObject
    });

    importBucket.grantReadWrite(importFileParserFunction);
    catalogItemsQueue.grantSendMessages(importFileParserFunction);

    const policy = new iam.PolicyStatement({
      actions: ['s3:PutObject', 's3:DeleteObject'],
      resources: [`${importBucket.bucketArn}/parsed/*`, `${importBucket.bucketArn}/uploaded/*`],
    });

    importFileParserFunction.addToRolePolicy(policy);

    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserFunction),
      { prefix: 'uploaded/' }
    );

    const api = new apigateway.RestApi(this, 'importProductsApi', {
      restApiName: 'Import Products Service',
      description: 'This service creates a signed URL for uploading CSV files with products.',
      deployOptions: {
        stageName: 'dev',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      }
    });

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', 
      new apigateway.LambdaIntegration(importProductsFile), {
        requestParameters: {
          'method.request.querystring.name': true,
        },
        requestValidatorOptions: {
          validateRequestParameters: true,
        },
      }
    );
  }
}
