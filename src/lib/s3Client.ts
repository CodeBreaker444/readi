import { env } from '@/backend/config/env';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

 
const BUCKET   = env.AWS_BUCKET_NAME!;
const REGION   = env.AWS_REGION!;

if (!BUCKET || !REGION) {
  throw new Error('Missing AWS_BUCKET_NAME or AWS_REGION in environment variables');
}

export const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId:     env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
  },
});


/**
 * Build the S3 object key for a ticket attachment.
 */
export function buildS3Key(ticketId: number, originalName: string): string {
  const ext  = originalName.split('.').pop() ?? 'bin';
  const safe = originalName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `maintenance/${ticketId}/${Date.now()}_${safe}`;
}

/**
 * Permanent (non-presigned) S3 URL for reference storage in the DB.
 * This URL requires the bucket/object to be public-readable.
 */
export function buildS3Url(key: string): string {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}


/**
 * Generate a presigned PUT URL so the client can upload directly to S3,
 * OR use this server-side before streaming the file into S3.
 *
 * @param key         S3 object key
 * @param contentType MIME type of the file
 * @param expiresIn   (default 5 min)
 */
export async function getPresignedUploadUrl(
  key: string,
  contentType: string,  
  expiresIn = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket:      BUCKET,
    Key:         key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn });
}


/**
 *
 * @param key       S3 object key
 * @param expiresIn Seconds until URL expires (default 15 min)
 */
export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 900
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key:    key,
  });
  return getSignedUrl(s3, command, { expiresIn });
}

 
/**
 * Upload a File/Buffer directly from the server to S3.
 * 
 */
export async function uploadFileToS3(
  key: string,
  file: File,
): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());

  await s3.send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: file.type,
      ContentDisposition: `attachment; filename="${file.name}"`,
      ServerSideEncryption: 'AES256',
    })
  );
}


export async function deleteFileFromS3(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

export { BUCKET, REGION };
