import { S3Event, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import csvParser from 'csv-parser';
import { Readable } from 'stream';

const s3Client = new S3Client({ region: process.env.CDK_DEFAULT_REGION });

export const handler: S3Handler = async (event: S3Event) => {
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

    return new Promise((resolve, reject) => {
      const stream = Readable.from(response.Body as any);
      
      stream
        .pipe(csvParser())
        .on('data', (data: any) => {
          console.log('Parsed record:', JSON.stringify(data));
        })
        .on('error', (error: unknown) => {
          console.error('Error parsing CSV:', error);
          reject(error);
        })
        .on('end', () => {
          console.log('Finished processing CSV file');
          resolve();
        });
    });
  } catch (error) {
    console.error('Error processing S3 event:', error);
  }
};
