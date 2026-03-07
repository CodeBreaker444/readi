"use server";

import { getPresignedDownloadUrl } from "./s3Client";


export async function getFileDownloadUrl(key: string): Promise<string> {
  if (!key) throw new Error("Missing file key");
  return getPresignedDownloadUrl(key);
}