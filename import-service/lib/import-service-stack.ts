import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const importBucket = s3.Bucket.fromBucketName(this, 'ImportBucket', 'rs-tatiana-import-bucket');

    const importProductsFile = new NodejsFunction(this, 'importProductsFileFunction', {
      runtime: Runtime.NODEJS_22_X,
      entry: path.join(__dirname, '../lambdas/importProductsFile.ts'),
      handler: 'handler',
      environment: {
        BUCKET_NAME: importBucket.bucketName,
        UPLOAD_FOLDER: 'uploaded',
      },
      bundling: {
        minify: true,
        sourceMap: true,
        target: 'es2020',
        externalModules: ['aws-sdk'],
        forceDockerBundling: false,
      },
    });

    importBucket.grantReadWrite(importProductsFile);

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
