import { Handler } from 'aws-cdk-lib/aws-lambda';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PRODUCTS } from './products';
import { formatResponse } from './utils';

export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const id = event.pathParameters?.id;
    const product = PRODUCTS.find((product) => product.id === id);

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
