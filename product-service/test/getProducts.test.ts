import { handler as getProducts } from '../lib/lambdas/getProducts';
import { APIGatewayProxyEvent } from 'aws-lambda';
import  * as ProductService from '../lib/lambdas/services/ProductService';

jest.mock('../lib/lambdas/services/ProductService');

describe('getProducts Lambda', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all products successfully', async () => {
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

    const resultProducts = [{
      ...mockProductData,
      count: mockStockData.count
    }];

    (ProductService.getAllProducts as jest.Mock).mockResolvedValueOnce(resultProducts);

    const event = {} as APIGatewayProxyEvent;

    const response = await getProducts(event);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(resultProducts);
    expect(JSON.parse(response.body).length).toBe(1);
  });

  it('should return empty array when no products exist', async () => {
    (ProductService.getAllProducts as jest.Mock).mockResolvedValueOnce([]);

    const event = {} as APIGatewayProxyEvent;

    const response = await getProducts(event);

    console.log(response);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual([]);
    expect(JSON.parse(response.body).length).toEqual(0);
  });

  it('should return 500 for DynamoDB errors', async () => {
    (ProductService.getAllProducts as jest.Mock).mockRejectedValue(new Error('DynamoDB error'));

    const event = {} as APIGatewayProxyEvent;

    const response = await getProducts(event);

    console.log(response);

    expect(response.statusCode).toBe(500);
    expect(JSON.parse(response.body)).toEqual({
      error: 'Internal Server Error',
      message: 'An unexpected error occurred',
    });
  });
});
