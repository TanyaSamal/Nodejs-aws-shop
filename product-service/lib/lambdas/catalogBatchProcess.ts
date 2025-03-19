import { SQSEvent, SQSRecord } from 'aws-lambda';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import  * as ProductService from './services/ProductService';
import { formatResponse, validateProductData, validateStockData } from './utils';
import { Product } from './models/product';

const snsClient = new SNSClient({});
const SNS_TOPIC_ARN = process.env.SNS_TOPIC_ARN!;

export const handler = async (event: SQSEvent) => {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[],
    createdProducts: [] as Product[]
  };

  if (event.Records.length === 0) {
    return formatResponse(400, {
      error: 'Records are empty'
    });
  }

  const recordPromises = event.Records.map(async (record) => {
    try {
      const product = await processRecord(record);
      results.successful++;
      results.createdProducts.push(product);
    } catch (error) {
      results.failed++;
      results.errors.push(
        `Failed to process message ${record.messageId}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.error('Error details:', {
        messageId: record.messageId,
        error: error instanceof Error ? error.stack : error
      });
    }
  });

  await Promise.all(recordPromises);

  if (results.createdProducts.length > 0) {
    try {
      await sendSNSNotification(results.createdProducts);
    } catch (error) {
      console.error('Failed to send SNS notification:', error);
    }
  }
  
  if (results.failed > 0) {
    console.warn('Processing summary:', {
      totalProcessed: event.Records.length,
      successful: results.successful,
      failed: results.failed,
      errors: results.errors
    });
  }

  return formatResponse(results.failed > 0 ? 206 : 200,
    JSON.stringify({
      message: `Processed ${results.successful} products successfully, ${results.failed} failed`,
      errors: results.errors
    }),
  )
};

const processRecord = async (record: SQSRecord): Promise<Product> => {
  try {
    const { title, description, price, count } = JSON.parse(record.body);

    if (!validateProductData({ title, description, price }) || !validateStockData({ count })) {
      throw new Error('Invalid product data structure');
    }

    return await ProductService.createProduct({
      title,
      description,
      price
    }, count);
  } catch (error) {
    if (error instanceof SyntaxError) {
      console.error(`Invalid JSON in message: ${record.body}`);
      throw new Error(`Failed to parse message: ${error.message}`);
    }

    throw error;
  }
};

const sendSNSNotification = async (results: Product[]) => {
  for (const product of results) {
    const command = new PublishCommand({
      TopicArn: SNS_TOPIC_ARN,
      Subject: 'AWS DB Products Created Successfully',
      Message: JSON.stringify({
        message: `Product ${product.title} created`,
        product: product,
        price: Number(product.price),
      }),
      MessageAttributes: {
        price: {
          DataType: 'Number',
          StringValue: product.price.toString()
        }
      }
    });

    await snsClient.send(command);
  }
};
