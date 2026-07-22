import type { CompletedPart, R2Env } from '../../../lib/r2';

export type { CompletedPart, R2Env };

/** Port over object storage (R2/S3-compatible). */
export interface ObjectStorage {
  readonly env: R2Env;
  buildKey(folder: string | undefined, fileName: string): string;
  publicObjectUrl(key: string): string;
  getPresignedPutUrl(input: {
    key: string;
    contentType: string;
    contentLength: number;
    expiresIn: number;
  }): Promise<string>;
  getPresignedUploadPartUrl(input: {
    key: string;
    uploadId: string;
    partNumber: number;
    expiresIn: number;
  }): Promise<string>;
  initMultipartUpload(input: { key: string; contentType: string }): Promise<string>;
  completeMultipartUpload(input: { key: string; uploadId: string; parts: CompletedPart[] }): Promise<void>;
  abortMultipartUpload(input: { key: string; uploadId: string }): Promise<void>;
}

export type GetSingleUrlInput = {
  fileName: string;
  fileType: string;
  folder?: string;
  fileSize: number;
};

export type GetSingleUrlResult = {
  uploadUrl: string;
  fileUrl: string;
  key: string;
  expiresIn: number;
};

export type InitMultipartInput = {
  fileName: string;
  fileType: string;
  folder?: string;
  fileSize: number;
};

export type InitMultipartResult = {
  uploadId: string;
  key: string;
};

export type GetPartUrlInput = {
  key: string;
  uploadId: string;
  partNumber: number;
  partSize: number;
  isLastPart?: boolean;
};

export type GetPartUrlResult = {
  uploadUrl: string;
  partNumber: number;
  expiresIn: number;
};

export type CompleteUploadInput = {
  key: string;
  uploadId: string;
  parts: CompletedPart[];
};

export type CompleteUploadResult = {
  fileUrl: string;
  key: string;
};

export type AbortUploadInput = {
  key: string;
  uploadId: string;
};
