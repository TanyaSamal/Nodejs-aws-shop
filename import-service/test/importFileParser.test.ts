import { S3Event, Context } from 'aws-lambda';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { mockClient } from 'aws-sdk-client-mock';
import { handler } from '../lambdas/importFileParser';
import { PassThrough } from 'stream';

const s3Mock = mockClient(S3Client);

describe('importFileParser Lambda Function', () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: false,
    functionName: 'test-function',
    functionVersion: '1',
    invokedFunctionArn: 'arn:aws:lambda:test:123456789012:function:test-function',
    memoryLimitInMB: '128',
    awsRequestId: 'test-id',
    logGroupName: '/aws/lambda/test-function',
    logStreamName: '2025/01/01/[$LATEST]test-log-stream',
    getRemainingTimeInMillis: () => 1000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  it('should process CSV file and log records', async () => {
    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: 'my-bucket' },
            object: { key: 'uploaded/example.csv' },
          },
        },
      ],
    } as any;

    const csvContent = 'id,title,description,price,count\n1,Title csv,Example description csv,133,4\n';
    const stream = new PassThrough();
    stream.end(csvContent);

    s3Mock.on(GetObjectCommand, {
      Bucket: 'my-bucket',
      Key: 'uploaded/example.csv',
    }).resolves({
      Body: Object.assign(stream, {
        transformToByteArray: async () => Buffer.from(csvContent),
        transformToString: async () => csvContent,
        transformToWebStream: () => new ReadableStream(),
      }),
    });

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    await handler(event, mockContext, () => {});

    expect(logSpy).toHaveBeenCalledTimes(3);
    expect(logSpy).toHaveBeenCalledWith('Processing file: uploaded/example.csv from bucket: my-bucket');
    expect(logSpy).toHaveBeenCalledWith('Parsed record:', JSON.stringify({
      id: '1',
      title: 'Title csv',
      description: 'Example description csv',
      price: '133',
      count: '4',
    }));
    expect(logSpy).toHaveBeenCalledWith('Finished processing CSV file');

    logSpy.mockRestore();
  });

  it('should skip folders with other names', async () => {
    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: 'my-bucket' },
            object: { key: 'other-folder/example.csv' },
          },
        },
      ],
    } as any;

    const logSpy = jest.spyOn(console, 'log').mockImplementation();

    await handler(event, mockContext, () => {});

    expect(logSpy).toHaveBeenCalledWith('Skipping object with key: other-folder/example.csv');

    logSpy.mockRestore();
  });

  it('should handle errors', async () => {
    const event: S3Event = {
      Records: [
        {
          s3: {
            bucket: { name: 'my-bucket' },
            object: { key: 'uploaded/example.csv' },
          },
        },
      ],
    } as any;

    s3Mock.on(GetObjectCommand, {
      Bucket: 'my-bucket',
      Key: 'uploaded/example.csv',
    }).rejects(new Error('S3 error'));

    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    await handler(event, mockContext, () => {});

    expect(errorSpy).toHaveBeenCalledWith('Error processing S3 event:', new Error('S3 error'));

    errorSpy.mockRestore();
  });
});
