import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatResponse } from './utils';
import  * as ProductService from './services/ProductService';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Processing getProducts request');

    const products = await ProductService.getAllProducts();

    console.log('Successfully get products', products);

    return formatResponse(200, products);
  } catch (error) {
    console.log('Request error', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    return formatResponse(500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
