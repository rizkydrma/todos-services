import {
  abortMultipartUpload,
  buildKey,
  completeMultipartUpload,
  getPresignedPutUrl,
  getPresignedUploadPartUrl,
  initMultipartUpload,
  publicObjectUrl,
  type CompletedPart,
  type R2Env,
} from '../../../lib/r2';
import type { ObjectStorage } from '../application/ports';

/** R2 adapter — thin wrap over lib/r2 (shared until auth migrates off lib/r2). */
export class R2ObjectStorage implements ObjectStorage {
  constructor(public readonly env: R2Env) {}

  buildKey(folder: string | undefined, fileName: string): string {
    return buildKey(folder, fileName);
  }

  publicObjectUrl(key: string): string {
    return publicObjectUrl(this.env, key)!;
  }

  getPresignedPutUrl(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresIn: number;
  }): Promise<string> {
    return getPresignedPutUrl(this.env, input);
  }

  getPresignedUploadPartUrl(input: {
    key: string;
    uploadId: string;
    partNumber: number;
    expiresIn: number;
  }): Promise<string> {
    return getPresignedUploadPartUrl(this.env, input);
  }

  initMultipartUpload(input: { key: string; contentType: string }): Promise<string> {
    return initMultipartUpload(this.env, input);
  }

  completeMultipartUpload(input: { key: string; uploadId: string; parts: CompletedPart[] }): Promise<void> {
    return completeMultipartUpload(this.env, input);
  }

  abortMultipartUpload(input: { key: string; uploadId: string }): Promise<void> {
    return abortMultipartUpload(this.env, input);
  }
}
