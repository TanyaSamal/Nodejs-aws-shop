import { Handler } from 'aws-cdk-lib/aws-lambda';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { PRODUCTS } from './products';
import { formatResponse } from './utils';

export const handler: Handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    return formatResponse(200, PRODUCTS);
  } catch (error) {
    return formatResponse(500, {
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  }
};
