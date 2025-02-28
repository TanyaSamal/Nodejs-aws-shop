import { handler as createProduct } from '../lib/lambdas/createProduct';
import { APIGatewayProxyEvent } from 'aws-lambda';
import  * as ProductService from '../lib/lambdas/services/ProductService';

jest.mock('../lib/lambdas/services/ProductService');

describe('createProduct Lambda', () => {
  const product = {
    title: 'Test product',
    description: 'Test description',
    price: 80
  };
  const stock = {
    count: 10
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully create a product', async () => {
    const newProduct = {
      ...product,
      ...stock
    };

    const event = {
      body: JSON.stringify(newProduct)
    } as APIGatewayProxyEvent;

    (ProductService.createProduct as jest.Mock).mockResolvedValueOnce(newProduct);

    const response = await createProduct(event);

    expect(response.statusCode).toBe(201);
    const responseBody = JSON.parse(response.body);
    expect(responseBody).toEqual(newProduct);
  });

  it('should return 400 for invalid product data', async () => {
    const mockProduct = {
      title: 'Test Product',
    };

    (ProductService.createProduct as jest.Mock).mockResolvedValueOnce(undefined);

    const event = {
      body: JSON.stringify(mockProduct)
    } as APIGatewayProxyEvent;

    const response = await createProduct(event);

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body)).toHaveProperty('error', 'Validation failed');
  });
});
