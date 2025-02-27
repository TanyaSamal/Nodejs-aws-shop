import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { formatResponse } from './utils';
import  * as ProductService from './services/ProductService';

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const id = event.pathParameters?.id;

    if (!id) {
      return formatResponse(400, {
        message: 'Product id was not provided',
      })
    }
  
    const product = await ProductService.getProductById(id);

    if (!product) {
      return formatResponse(404, {
        error: 'Not Found',
        message: `Product with id=${id} not found`,
      })
    }

    return formatResponse(200, product);

  } catch (error) {
    return formatResponse(500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
