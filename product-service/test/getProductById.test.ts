import { handler as getProductById } from '../lib/lambdas/getProductById';
import { APIGatewayProxyEvent } from 'aws-lambda';
import  * as ProductService from '../lib/lambdas/services/ProductService';

jest.mock('../lib/lambdas/services/ProductService');

describe('getProductById Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return a combined product when found in both tables', async () => {
    const mockProductData = {
      id: '1',
      title: 'Test Product',
      description: 'Test Description',
      price: 100
    };

    const mockStockData = {
      product_id: '1',
      count: 10
    };

    const resultProduct = {
      ...mockProductData,
      count: mockStockData.count
    };

    const event = {
      pathParameters: {
        id: '1'
      }
    } as unknown as APIGatewayProxyEvent;

    (ProductService.getProductById as jest.Mock).mockResolvedValueOnce(resultProduct);

    const response = await getProductById(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(resultProduct);
  });

  it('should return 404 when product is not found', async () => {
    const event = {
      pathParameters: {
        id: 'non-existent-id'
      }
    } as unknown as APIGatewayProxyEvent;

    (ProductService.getProductById as jest.Mock).mockResolvedValueOnce(undefined);

    const response = await getProductById(event);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body)).toEqual({
      error: 'Not Found',
      message: 'Product with id=non-existent-id not found'
    });
  });

  it('should return 400 when productId is missing', async () => {
    const event = {
      pathParameters: null
    } as unknown as APIGatewayProxyEvent;

    const response = await getProductById(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      message: 'Product id was not provided'
    });
  });

  it('should return 500 for DynamoDB errors', async () => {
    const event = {
      pathParameters: {
        id: '1'
      }
    } as unknown as APIGatewayProxyEvent;

    (ProductService.getProductById as jest.Mock).mockRejectedValue(new Error('DynamoDB error'));

    const response = await getProductById(event);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });
});
