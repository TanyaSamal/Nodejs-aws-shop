import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const client = new DynamoDBClient({ region: process.env.CDK_DEFAULT_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(client);

const fillTables = async () => {
  for (let i = 1; i <= 10; i++) {
    const productId = randomUUID();

    const product = {
      title: `Product ${i}`,
      description: `Description ${i}`,
      price: i * 100,
    };

    await ddbDocClient.send(new PutCommand({
      TableName: 'Products',
      Item: {
        id: productId,
        title: product.title,
        description: product.description,
        price: product.price,
      },
    }));

    const stocks = {
      count: i * 10,
    };

    await ddbDocClient.send(new PutCommand({
      TableName: 'Stocks',
      Item: {
        product_id: productId,
        count: stocks.count,
      },
    }));
  }

  console.log('Tables filled with test data!');
};

fillTables().catch(console.error);
