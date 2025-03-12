import { APIGatewayProxyEvent } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../lambdas/importProductsFile';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Mock = mockClient(S3Client);

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

describe('importProductsFile Lambda Function', () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  it('should generate a pre-signed URL successfully', async () => {
    const event: APIGatewayProxyEvent = {
      queryStringParameters: {
        name: 'example.csv',
      },
    } as any;

    (getSignedUrl as jest.Mock).mockResolvedValue('https://example.com/signed-url');

    s3Mock.on(PutObjectCommand).resolves({});
    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('https://example.com/signed-url');
  });

  it('should return an error if query parameters are empty', async () => {
    const event: APIGatewayProxyEvent = {
      queryStringParameters: {},
    } as any;

    const result = await handler(event);

    expect(result.statusCode).toBe(400);
    expect(JSON.parse(result.body)).toStrictEqual({ message: 'File name is required' });
  });

  it('should handle errors', async () => {
    const event: APIGatewayProxyEvent = {
      queryStringParameters: {
        name: 'example.csv',
      },
    } as any;

    (getSignedUrl as jest.Mock).mockRejectedValue(new Error('S3 error'));

    const result = await handler(event);

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toStrictEqual({ message: 'Internal server error' });
  });
});
