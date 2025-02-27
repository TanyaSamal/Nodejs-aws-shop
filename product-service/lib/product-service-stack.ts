import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import path = require('path');
import { Construct } from 'constructs';

const productsTableName = process.env.PRODUCTS_TABLE || 'Products';
const stocksTableName = process.env.STOCK_TABLE || 'Stocks';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    //DynamoDb tables
    const productsTable = dynamodb.Table.fromTableName(
      this,
      'ProductsTable',
      productsTableName
    );

    const stocksTable = dynamodb.Table.fromTableName(
      this,
      'StocksTable',
      stocksTableName
    );

    // Create Lambda functions
    const getProducts = new lambda.Function(this, 'getProductsFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProducts.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stocksTable.tableName
      }
    });

    const getProductById = new lambda.Function(this, 'getProductByIdFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'getProductById.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
      environment: {
        PRODUCTS_TABLE_NAME: productsTable.tableName,
        STOCK_TABLE_NAME: stocksTable.tableName
      }
    });
    
    productsTable.grantReadData(getProducts);
    productsTable.grantReadData(getProductById);
    stocksTable.grantReadData(getProducts);
    stocksTable.grantReadData(getProductById);

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
