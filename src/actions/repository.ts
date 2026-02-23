'use server';

import { getPresignedDownloadUrl } from '@/lib/s3Client';

export async function getDownloadUrl(s3Key: string): Promise<string> {
    return getPresignedDownloadUrl(s3Key, 900);
}

 