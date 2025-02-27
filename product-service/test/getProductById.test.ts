import { APIGatewayProxyEvent } from 'aws-lambda';
import { handler as getProductById} from '../lib/lambdas/getProductById';
import { PRODUCTS } from '../lib/lambdas/mocks/products';

describe('getProducts Lambda', () => {
  let mockEvent: APIGatewayProxyEvent;

  beforeEach(() => {
    mockEvent = {
      httpMethod: 'GET',
      path: '/products/{id}',
      headers: {},
      multiValueHeaders: {},
      queryStringParameters: null,
      multiValueQueryStringParameters: null,
      pathParameters: { id: '1' },
      stageVariables: null,
      requestContext: {} as any,
      resource: '',
      isBase64Encoded: false,
      body: null,
    };
  });

  it('should return a product when valid ID is provided', async () => {
    const response = await getProductById(mockEvent);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(PRODUCTS[0]);
    expect(response.headers).toEqual({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
      'Content-Type': 'application/json',
    });
  });

  it('should return 404 when product is not found', async () => {
    mockEvent.pathParameters = { id: '10' };
    const response = await getProductById(mockEvent);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body).error).toEqual('Not Found');
  });

  it('should handle errors gracefully', async () => {
    jest.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
      throw new Error('Unexpected error');
    });

    const response = await getProductById(mockEvent);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });

});
