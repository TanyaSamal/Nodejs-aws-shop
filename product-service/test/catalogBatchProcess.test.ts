import { SQSEvent, SQSRecord } from 'aws-lambda';
import { handler as catalogBatchProcess } from '../lib/lambdas/catalogBatchProcess';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import  * as ProductService from '../lib/lambdas/services/ProductService';

jest.mock('../lib/lambdas/services/ProductService');

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn(() => ({
    send: jest.fn()
  })),
  PublishCommand: jest.fn()
}));

describe('catalogBatchProcess', () => {
  let mockEvent: SQSEvent;
  let snsClient: jest.Mocked<SNSClient>;
  const testProduct = {
    title: 'Test Product',
    description: 'Test Description',
    price: 1,
    count: 10
  };
  
  beforeEach(() => {
    jest.clearAllMocks();

    snsClient = new SNSClient({}) as jest.Mocked<SNSClient>;

    mockEvent = {
      Records: [
        {
          body: JSON.stringify(testProduct)
        }
      ]
    } as SQSEvent;
  });

  it('should process valid products, add it to DB and publish to SNS', async () => {
    (snsClient.send as jest.Mock).mockResolvedValue({
      MessageId: 'test-message-id'
    });

    (ProductService.createProduct as jest.Mock).mockResolvedValueOnce(testProduct);

    const result = await catalogBatchProcess(mockEvent);

    expect(result.statusCode).toBe(200);
    expect(ProductService.createProduct).toHaveBeenCalledTimes(1);
    expect(PublishCommand).toHaveBeenCalledTimes(1);
  });

  it('should process multiple records', async () => {
    (snsClient.send as jest.Mock).mockResolvedValue({
      MessageId: 'test-message-id'
    });

    const secondProduct = {
      title: 'Second Product',
      description: 'Second Description',
      price: 4,
      count: 5
    };

    mockEvent.Records.push({
      body: JSON.stringify(secondProduct)
    } as SQSRecord);

    (ProductService.createProduct as jest.Mock).mockResolvedValueOnce(testProduct);
    (ProductService.createProduct as jest.Mock).mockResolvedValueOnce(secondProduct);

    const result = await catalogBatchProcess(mockEvent);
    
    expect(result.statusCode).toBe(200);
    expect(ProductService.createProduct).toHaveBeenCalledTimes(2);
    expect(PublishCommand).toHaveBeenCalledTimes(1);
  });

  it('should handle invalid product data (missing fields)', async () => {
    mockEvent.Records[0].body = JSON.stringify({
      title: 'Test Product'
    });

    const result = await catalogBatchProcess(mockEvent);

    expect(result.statusCode).toBe(206);
    expect(snsClient.send).not.toHaveBeenCalled();
  });

  it('should handle empty event records', async () => {
    mockEvent.Records = [];

    const result = await catalogBatchProcess(mockEvent);
    
    expect(result.statusCode).toBe(400);
    expect(snsClient.send).not.toHaveBeenCalled();
  });

  it('should handle SNS publish failure', async () => {
    (snsClient.send as jest.Mock).mockReturnValue({
      promise: jest.fn().mockRejectedValue(new Error('SNS publish failed'))
    });

    await catalogBatchProcess(mockEvent);

    expect(snsClient.send).not.toHaveBeenCalled();
  });
});
