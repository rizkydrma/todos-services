/**
 * R2 via S3-compatible API (same pattern as Paris PM uploads).
 * - @aws-sdk/client-s3 + s3-request-presigner → presigned PUT / UploadPart (no HTTP to R2)
 * - aws4fetch → direct S3 HTTP (multipart init/complete/abort, HEAD, DELETE) for Workers
 */
import { S3Client, PutObjectCommand, UploadPartCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { AwsClient } from 'aws4fetch';

export type R2Env = {
  R2_ACCOUNT_ID: string;
  R2_ACCESS_KEY_ID: string;
  R2_SECRET_ACCESS_KEY: string;
  R2_BUCKET_NAME: string;
  R2_PUBLIC_URL: string;
};

/** Presigned URL TTL (1 hour) — matches docs/r2-upload-mechanism.md */
export const PRESIGN_TTL_SECONDS = 3600;
/** Single PUT max — files larger should use multipart */
export const SINGLE_UPLOAD_MAX_BYTES = 50 * 1024 * 1024; // 50 MB
/** Multipart absolute max */
export const MULTIPART_MAX_BYTES = 20 * 1024 * 1024 * 1024; // 20 GB
/** R2 minimum part size (except last part) */
export const MULTIPART_MIN_PART_BYTES = 5 * 1024 * 1024; // 5 MB

export function createS3Client(env: R2Env) {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    requestChecksumCalculation: 'WHEN_REQUIRED',
    responseChecksumValidation: 'WHEN_REQUIRED',
  });
}

export function createAwsClient(env: R2Env) {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    region: 'auto',
    service: 's3',
  });
}

/** Virtual-hosted style: https://{bucket}.{account}.r2.cloudflarestorage.com/{key} */
export function r2S3Url(env: R2Env, key: string, query?: string): string {
  const base = `https://${env.R2_BUCKET_NAME}.${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;
  return query ? `${base}?${query}` : base;
}

export function publicObjectUrl(env: Pick<R2Env, 'R2_PUBLIC_URL'>, key: string | null | undefined): string | null {
  if (!key) return null;
  const base = env.R2_PUBLIC_URL.replace(/\/$/, '');
  return `${base}/${key}`;
}

/**
 * Build object key: `{folder}/{timestamp}_{sanitized_filename}`
 * Default folder is `uploads`.
 */
export function buildKey(folder: string | undefined, fileName: string): string {
  const raw = (folder?.trim() || 'uploads').replace(/^\/+|\/+$/g, '');
  const safeFolder = raw || 'uploads';
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${safeFolder}/${Date.now()}_${sanitized}`;
}

export function requireR2Env(env: Partial<R2Env> | undefined): R2Env {
  if (
    !env?.R2_ACCOUNT_ID ||
    !env.R2_ACCESS_KEY_ID ||
    !env.R2_SECRET_ACCESS_KEY ||
    !env.R2_BUCKET_NAME ||
    !env.R2_PUBLIC_URL
  ) {
    throw new Error('R2 is not configured');
  }
  return {
    R2_ACCOUNT_ID: env.R2_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: env.R2_BUCKET_NAME,
    R2_PUBLIC_URL: env.R2_PUBLIC_URL,
  };
}

export async function getPresignedPutUrl(
  env: R2Env,
  input: { key: string; contentType: string; contentLength?: number; expiresIn?: number },
): Promise<string> {
  const client = createS3Client(env);
  const command = new PutObjectCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: input.key,
    ContentType: input.contentType,
    ...(input.contentLength != null ? { ContentLength: input.contentLength } : {}),
  });
  return getSignedUrl(client, command, {
    expiresIn: input.expiresIn ?? PRESIGN_TTL_SECONDS,
  });
}

export async function getPresignedUploadPartUrl(
  env: R2Env,
  input: {
    key: string;
    uploadId: string;
    partNumber: number;
    expiresIn?: number;
  },
): Promise<string> {
  const client = createS3Client(env);
  const command = new UploadPartCommand({
    Bucket: env.R2_BUCKET_NAME,
    Key: input.key,
    UploadId: input.uploadId,
    PartNumber: input.partNumber,
  });
  return getSignedUrl(client, command, {
    expiresIn: input.expiresIn ?? PRESIGN_TTL_SECONDS,
  });
}

/** Initiate multipart upload; returns UploadId from XML. */
export async function initMultipartUpload(env: R2Env, input: { key: string; contentType: string }): Promise<string> {
  const client = createAwsClient(env);
  const res = await client.fetch(r2S3Url(env, input.key, 'uploads'), {
    method: 'POST',
    headers: { 'Content-Type': input.contentType },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`R2 CreateMultipartUpload failed: ${res.status} ${body}`);
  }
  const xml = await res.text();
  const match = xml.match(/<UploadId>([^<]+)<\/UploadId>/);
  if (!match?.[1]) {
    throw new Error('R2 CreateMultipartUpload: missing UploadId in response');
  }
  return match[1];
}

export type CompletedPart = { PartNumber: number; ETag: string };

export async function completeMultipartUpload(
  env: R2Env,
  input: { key: string; uploadId: string; parts: CompletedPart[] },
): Promise<void> {
  const client = createAwsClient(env);
  const sorted = [...input.parts].sort((a, b) => a.PartNumber - b.PartNumber);
  const partsXml = sorted
    .map((p) => `<Part><PartNumber>${p.PartNumber}</PartNumber><ETag>${escapeXml(p.ETag)}</ETag></Part>`)
    .join('');
  const body = `<CompleteMultipartUpload>${partsXml}</CompleteMultipartUpload>`;
  const res = await client.fetch(r2S3Url(env, input.key, `uploadId=${encodeURIComponent(input.uploadId)}`), {
    method: 'POST',
    headers: { 'Content-Type': 'application/xml' },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`R2 CompleteMultipartUpload failed: ${res.status} ${text}`);
  }
}

export async function abortMultipartUpload(env: R2Env, input: { key: string; uploadId: string }): Promise<void> {
  const client = createAwsClient(env);
  const res = await client.fetch(r2S3Url(env, input.key, `uploadId=${encodeURIComponent(input.uploadId)}`), {
    method: 'DELETE',
  });
  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => '');
    throw new Error(`R2 AbortMultipartUpload failed: ${res.status} ${text}`);
  }
}

export type R2ObjectMeta = {
  contentType: string | null;
  contentLength: number | null;
};

/** HEAD object via aws4fetch (S3 API). */
export async function headObject(env: R2Env, key: string): Promise<R2ObjectMeta | null> {
  const client = createAwsClient(env);
  const res = await client.fetch(r2S3Url(env, key), { method: 'HEAD' });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`R2 HEAD failed: ${res.status}`);
  }
  const contentType = res.headers.get('content-type');
  const lenRaw = res.headers.get('content-length');
  const contentLength = lenRaw != null ? Number(lenRaw) : null;
  return {
    contentType,
    contentLength: contentLength != null && !Number.isNaN(contentLength) ? contentLength : null,
  };
}

/** DELETE object via aws4fetch — best-effort callers should catch. */
export async function deleteObject(env: R2Env, key: string): Promise<void> {
  const client = createAwsClient(env);
  const res = await client.fetch(r2S3Url(env, key), { method: 'DELETE' });
  if (!res.ok && res.status !== 404) {
    throw new Error(`R2 DELETE failed: ${res.status}`);
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
