import { APIGatewayProxyEvent } from 'aws-lambda';
import { PRODUCTS } from '../lib/lambdas/mocks/products';
import { handler as getProducts} from '../lib/lambdas/getProducts';

describe('getProducts Lambda', () => {
  let mockEvent: APIGatewayProxyEvent;

  beforeEach(() => {
    mockEvent = {
      httpMethod: 'GET',
      path: '/products',
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: null,
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
      isBase64Encoded: false,
      body: null,
    };
  });

  it('should return all products successfully', async () => {
    const response = await getProducts(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(PRODUCTS);
    expect(response.headers).toEqual({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json',
    });
  });

  it('should handle errors gracefully', async () => {
    // Mock products to throw an error
    jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });

    const response = await getProducts(mockEvent);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });
});
