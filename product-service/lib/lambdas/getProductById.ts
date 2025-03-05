import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatResponse } from './utils';
import  * as ProductService from './services/ProductService';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const id = event.pathParameters?.id;

    console.log(`Processing getProduct request with id=${id}`);

    if (!id) {
      console.log(`Missing product id=${id}`);

      return formatResponse(400, {
        message: 'Product id was not provided',
      })
    }
  
    const product = await ProductService.getProductById(id);

    if (!product) {
      console.log(`Product with id=${id} not found`);

      return formatResponse(404, {
        error: 'Not Found',
        message: `Product with id=${id} not found`,
      })
    }

    console.log(`Successfully get product with id=${id}`, product);

    return formatResponse(200, product);

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
