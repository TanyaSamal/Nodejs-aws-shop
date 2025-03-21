import { Product, ProductInStock } from '../models/product';
import { Stock } from '../models/stock';
import { randomUUID } from 'crypto';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.CDK_DEFAULT_REGION });
const ddbDocClient = DynamoDBDocumentClient.from(client);
const productsTableName = process.env.PRODUCTS_TABLE_NAME;
const stockTableName = process.env.STOCK_TABLE_NAME;

const createProduct = async (product: Product, count: number): Promise<Product> => {
  const productId = randomUUID();

  const productParams = {
    TableName: productsTableName,
    Item: {
      id: productId,
      ...product
    }
  };

  const stockParams = {
    TableName: stockTableName,
    Item: {
      product_id: productId,
      count
    }
  };
  
  await ddbDocClient.send(new TransactWriteCommand({
    TransactItems: [
      {
        Put: productParams
      },
      {
        Put: stockParams
      },
    ],
  }));

  return {
    id: productId,
    ...product,
  };
};

const getProductById = async (productId: string): Promise<ProductInStock> => {
  const productParams = {
    TableName: productsTableName,
    Key: {
      id: productId
    }
  };

  const stockParams = {
    TableName: stockTableName,
    Key: {
      product_id: productId
    }
  };

  const product = await ddbDocClient.send(new GetCommand(productParams));
  const stock = await ddbDocClient.send(new GetCommand(stockParams));

  return {
    ...(product.Item as Product),
    count: stock.Item ? stock.Item.count : 0
  };
};

const getAllProducts = async (): Promise<ProductInStock[]> => {
    const productsResult = await ddbDocClient.send(new ScanCommand({
      TableName: productsTableName,
    }));
    const products = productsResult.Items as Product[] || [];

    const stockResult = await ddbDocClient.send(new ScanCommand({
      TableName: stockTableName,
    }));
    const stockData = stockResult.Items as Stock[] || [];

    const joinedData = joinData(products, stockData);

    return joinedData;
};

const joinData = (products: Product[], stockData: Stock[]): ProductInStock[] => {
  return products.map(product => {
    const stock = stockData.find(stockItem => stockItem.product_id === product.id);
    return {
      ...product,
      count: stock ? stock.count : 0,
    };
  });
}

export { createProduct, getProductById, getAllProducts };
