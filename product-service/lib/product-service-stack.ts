import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import path = require('path');
import { Construct } from 'constructs';
import * as dotenv from "dotenv";

dotenv.config();

const productsTableName = process.env.PRODUCTS_TABLE || 'Products';
const stocksTableName = process.env.STOCK_TABLE || 'Stocks';
const subscriptionEmail = process.env.SUBSCRIPTION_EMAIL || 'myemail@example.com';
const filteredEmail = process.env.FILTERED_EMAIL || 'myemail@example.com';

export class ProductServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDb tables
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

    const lambdasEnv = {
      PRODUCTS_TABLE_NAME: productsTable.tableName,
      STOCK_TABLE_NAME: stocksTable.tableName
    };

    // SQS Queue
    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: 'catalogItemsQueue',
      visibilityTimeout: cdk.Duration.seconds(30),
    });

    // SNS Topic
    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      displayName: 'Product Creation Notifications',
    });

    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription(subscriptionEmail, {
          filterPolicyWithMessageBody: {
            price: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.numericFilter({
              lessThanOrEqualTo: 50
            }))
          },
          json: true
      })
    );

    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription(filteredEmail, {
        filterPolicyWithMessageBody: {
          price: sns.FilterOrPolicy.filter(sns.SubscriptionFilter.numericFilter({
            greaterThan: 50
          }))
        },
        json: true
      })
    );

    // Lambda functions
    const getProducts = new lambda.Function(this, 'getProductsFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'getProducts.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
      environment: lambdasEnv
    });

    const getProductById = new lambda.Function(this, 'getProductByIdFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'getProductById.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
      environment: lambdasEnv
    });

    const createProduct = new lambda.Function(this, 'createProductFunction', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'createProduct.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
      environment: lambdasEnv
    });
    
    productsTable.grantReadData(getProducts);
    productsTable.grantReadData(getProductById);
    productsTable.grantWriteData(createProduct);

    stocksTable.grantReadData(getProducts);
    stocksTable.grantReadData(getProductById);
    stocksTable.grantWriteData(createProduct);

    const catalogBatchProcess = new lambda.Function(this, 'catalogBatchProcess', {
      runtime: lambda.Runtime.NODEJS_22_X,
      handler: 'catalogBatchProcess.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, 'lambdas')),
      environment: {
        ...lambdasEnv,
        SNS_TOPIC_ARN: createProductTopic.topicArn,
      },
    });

    productsTable.grantWriteData(catalogBatchProcess);
    stocksTable.grantWriteData(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);

    catalogBatchProcess.addEventSource(new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
      batchSize: 5,
    }));

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

    // Create products resources and methods
    const products = api.root.addResource('products');
    products.addMethod('GET', new apigateway.LambdaIntegration(getProducts));
    products.addMethod('POST', new apigateway.LambdaIntegration(createProduct));

    const idResource = products.addResource('{id}');
    idResource.addMethod('GET', new apigateway.LambdaIntegration(getProductById), {
      requestParameters: {
        'method.request.path.id': true,
      }
    });
  }
}
