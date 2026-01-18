import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME;
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

let s3Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!s3Client) {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
      throw new Error("R2 credentials not configured. Please set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY.");
    }
    
    s3Client = new S3Client({
      region: "auto",
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export function isR2Configured(): boolean {
  const configured = !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY && R2_BUCKET_NAME);
  return configured;
}

export function logR2Config(): void {
  console.log(`[R2 Config] ACCOUNT_ID: ${R2_ACCOUNT_ID ? 'set' : 'NOT SET'}`);
  console.log(`[R2 Config] ACCESS_KEY_ID: ${R2_ACCESS_KEY_ID ? 'set' : 'NOT SET'}`);
  console.log(`[R2 Config] SECRET_ACCESS_KEY: ${R2_SECRET_ACCESS_KEY ? 'set' : 'NOT SET'}`);
  console.log(`[R2 Config] BUCKET_NAME: ${R2_BUCKET_NAME ? 'set' : 'NOT SET'}`);
  console.log(`[R2 Config] PUBLIC_URL: ${R2_PUBLIC_URL ? 'set' : 'NOT SET'}`);
  console.log(`[R2 Config] isR2Configured(): ${isR2Configured()}`);
}

export async function uploadToR2(
  key: string,
  body: Buffer | Readable,
  contentType: string
): Promise<{ url: string; key: string }> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME not configured");
  }
  
  const client = getR2Client();
  
  await client.send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  
  // R2 uses path-style URLs: https://{account_id}.r2.cloudflarestorage.com/{bucket}/{key}
  // Use custom public URL (CDN) if configured, otherwise use path-style endpoint
  const url = R2_PUBLIC_URL 
    ? `${R2_PUBLIC_URL}/${key}`
    : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
  
  return { url, key };
}

export async function getFromR2(key: string): Promise<{ body: Readable; contentType: string }> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME not configured");
  }
  
  const client = getR2Client();
  
  const response = await client.send(
    new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
  
  return {
    body: response.Body as Readable,
    contentType: response.ContentType || "application/octet-stream",
  };
}

export async function deleteFromR2(key: string): Promise<void> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME not configured");
  }
  
  const client = getR2Client();
  
  await client.send(
    new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    })
  );
}

export async function fileExistsInR2(key: string): Promise<boolean> {
  if (!R2_BUCKET_NAME) {
    throw new Error("R2_BUCKET_NAME not configured");
  }
  
  const client = getR2Client();
  
  try {
    await client.send(
      new HeadObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
      })
    );
    return true;
  } catch {
    return false;
  }
}

export function generateR2Key(prefix: string, filename: string): string {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `${prefix}/${timestamp}-${random}-${sanitizedFilename}`;
}

export function extractKeyFromR2Url(url: string): string | null {
  if (!R2_PUBLIC_URL) return null;
  if (url.startsWith(R2_PUBLIC_URL)) {
    return url.substring(R2_PUBLIC_URL.length + 1);
  }
  const match = url.match(/r2\.dev\/(.+)$/);
  return match ? match[1] : null;
}

export function getR2PublicUrl(): string | undefined {
  return R2_PUBLIC_URL;
}
