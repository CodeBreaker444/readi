import { env } from '@/backend/config/env';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const BUCKET = env.AWS_BUCKET_NAME ?? '';
export const REGION = env.AWS_REGION ?? '';

// Lazy singleton — defer validation until first use so missing S3 env vars
// don't crash unrelated routes at cold-start module evaluation time.
let _s3: S3Client | null = null;

function getS3(): S3Client {
  if (_s3) return _s3;
  if (!BUCKET || !REGION) {
    throw new Error('Missing AWS_BUCKET_NAME or AWS_REGION in environment variables');
  }
  _s3 = new S3Client({
    region: REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY!,
    },
  });
  return _s3;
}

// Exported for any callers that hold a direct reference to the client
export const s3: S3Client = new Proxy({} as S3Client, {
  get(_target, prop) {
    return (getS3() as any)[prop];
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
  return getSignedUrl(getS3(), command, { expiresIn });
}


export async function getPresignedDownloadUrl(
  key: string,
  expiresIn = 900,
  fileName?: string
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key:    key,
    ...(fileName && {
      ResponseContentDisposition: `attachment; filename="${encodeURIComponent(fileName)}"`,
    }),
  });
  return getSignedUrl(getS3(), command, { expiresIn });
}


export async function uploadFileToS3(
  key: string,
  file: File,
): Promise<void> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'application/octet-stream';

  await getS3().send(
    new PutObjectCommand({
      Bucket:      BUCKET,
      Key:         key,
      Body:        buffer,
      ContentType: contentType,
      ContentDisposition: `attachment; filename="${file.name}"`,
      ServerSideEncryption: 'AES256',
    })
  );
}


export async function deleteFileFromS3(key: string): Promise<void> {
  await getS3().send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}
