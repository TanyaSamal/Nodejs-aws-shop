import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatResponse, validateProductData, validateStockData } from './utils';
import  * as ProductService from './services/ProductService';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    console.log('Processing createProduct request', event);

    if (!event.body) {
      console.log('Missing request body');

      return formatResponse(400, {
        error: 'Bad Request',
        message: 'Request body is missing',
      });
    }

    const { title, description, price, count } = JSON.parse(event.body);

    if (!validateProductData({ title, description, price })) {
      console.log(`Validation error, missing fields:
        title=${title}, description=${description}, price=${price}`);

      return formatResponse(400, {
        error: 'Validation failed: missing fields'
      });
    }

    if (!validateStockData({ count })) {
      console.log(`Validation error, incorrect count=${count}`);

      return formatResponse(400, {
        error: 'Validation failed: incorrect data'
      });
    }

    const product = await ProductService.createProduct({
      title,
      description,
      price
    }, count);

    console.log('New product was successfuly created:', product);

    return formatResponse(201, product);
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
