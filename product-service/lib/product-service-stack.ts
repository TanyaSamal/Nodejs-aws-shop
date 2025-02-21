import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import path = require('path');
import { Construct } from 'constructs';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create Lambda functions
    const getProducts = new lambda.Function(this, 'getProductsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProducts.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
    });

    const getProductById = new lambda.Function(this, 'getProductByIdFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductById.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'ProductsApi', {
      restApiName: 'Products Service',
      deployOptions: {
        stageName: 'dev',
      },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS
      }
    });

    // Create products resources and GET methods
    const products = api.root.addResource('products');
    products.addMethod('GET', new apigateway.LambdaIntegration(getProducts));

    const idResource = products.addResource('{id}');
    idResource.addMethod('GET', new apigateway.LambdaIntegration(getProductById), {
      requestParameters: {
        'method.request.path.id': true,
      }
    });
  }
}
