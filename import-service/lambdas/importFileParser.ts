import { S3Event } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.CDK_DEFAULT_REGION });

const sqsClient = new SQSClient({});
const SQS_QUEUE_URL = process.env.SQS_QUEUE_URL!;

export const handler = async (event: S3Event) => {
  const bucketName = event.Records[0].s3.bucket.name;
  const objectKey = decodeURIComponent(event.Records[0].s3.object.key.replace(/\+/g, ' '));

  console.log(`Processing file: ${objectKey} from bucket: ${bucketName}`);

  if (!objectKey.startsWith('uploaded/')) {
    console.log(`Skipping object with key: ${objectKey}`);
    return;
  }

  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }));

    if (!response.Body) {
      throw new Error('Empty response body from S3 bucket');
    }

    await new Promise((resolve, reject) => {
      const stream = Readable.from(response.Body as any);
      
      stream
        .pipe(csvParser())
        .on('data', async (data: any) => {
          try {
            stream.pause();

            await sendDataToSQS(data);
            
            stream.resume();
          } catch (error) {
            console.error('Error processing record:', error);
          }
        })
        .on('error', (error: unknown) => {
          console.error('Error parsing CSV:', error);
          reject(error);
        })
        .on('end', () => {
          console.log('Finished processing CSV file');
          resolve("Success");
        });
    });

    const newKey = objectKey.replace('uploaded/', 'parsed/');

    await s3Client.send(new CopyObjectCommand({
      Bucket: bucketName,
      CopySource: `${bucketName}/${objectKey}`,
      Key: newKey,
    }));

    await s3Client.send(new DeleteObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }));

    console.log(`File moved from ${objectKey} to ${newKey}`);

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Successfully processed file' }),
    };
  } catch (error) {
    console.error('Error processing S3 event:', error);
    throw error;
  }
};

async function sendDataToSQS(record: any): Promise<void> {
  try {
    const command = new SendMessageCommand({
      QueueUrl: SQS_QUEUE_URL,
      MessageBody: JSON.stringify({
        title: record.title,
        description: record.description,
        price: Number(record.price),
        count: Number(record.count)
      }),
    });

    await sqsClient.send(command);
    console.log('Successfully sent message to SQS:', record.title);
  } catch (error) {
    console.error('Error sending message to SQS:', error);
    throw error;
  }
}
