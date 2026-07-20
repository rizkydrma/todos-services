import { AppError } from '../lib/errors';
import {
  MULTIPART_MAX_BYTES,
  MULTIPART_MIN_PART_BYTES,
  PRESIGN_TTL_SECONDS,
  SINGLE_UPLOAD_MAX_BYTES,
  abortMultipartUpload,
  buildKey,
  completeMultipartUpload,
  getPresignedPutUrl,
  getPresignedUploadPartUrl,
  initMultipartUpload,
  publicObjectUrl,
  type CompletedPart,
  type R2Env,
} from '../lib/r2';

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

export class UploadsService {
  constructor(private r2: R2Env) {}

  async getSingleUrl(input: GetSingleUrlInput): Promise<GetSingleUrlResult> {
    if (input.fileSize <= 0) {
      throw AppError.validation('fileSize must be positive');
    }
    if (input.fileSize > SINGLE_UPLOAD_MAX_BYTES) {
      throw AppError.validation(
        `File too large for single upload (max ${SINGLE_UPLOAD_MAX_BYTES} bytes); use multipart`,
        { maxBytes: SINGLE_UPLOAD_MAX_BYTES },
      );
    }

    const key = buildKey(input.folder, input.fileName);
    const uploadUrl = await getPresignedPutUrl(this.r2, {
      key,
      contentType: input.fileType,
      contentLength: input.fileSize,
      expiresIn: PRESIGN_TTL_SECONDS,
    });

    return {
      uploadUrl,
      fileUrl: publicObjectUrl(this.r2, key)!,
      key,
      expiresIn: PRESIGN_TTL_SECONDS,
    };
  }

  async initMultipart(input: InitMultipartInput): Promise<InitMultipartResult> {
    if (input.fileSize <= 0) {
      throw AppError.validation('fileSize must be positive');
    }
    if (input.fileSize > MULTIPART_MAX_BYTES) {
      throw AppError.validation(`File exceeds multipart maximum of ${MULTIPART_MAX_BYTES} bytes`);
    }

    const key = buildKey(input.folder, input.fileName);
    try {
      const uploadId = await initMultipartUpload(this.r2, {
        key,
        contentType: input.fileType,
      });
      return { uploadId, key };
    } catch (err) {
      throw AppError.internal(err instanceof Error ? err.message : 'Failed to init multipart upload');
    }
  }

  async getPartUrl(input: GetPartUrlInput): Promise<GetPartUrlResult> {
    if (input.partNumber < 1 || input.partNumber > 10_000) {
      throw AppError.validation('partNumber must be between 1 and 10000');
    }
    if (input.partSize <= 0) {
      throw AppError.validation('partSize must be positive');
    }
    if (!input.isLastPart && input.partSize < MULTIPART_MIN_PART_BYTES) {
      throw AppError.validation(`Non-final parts must be at least ${MULTIPART_MIN_PART_BYTES} bytes`, {
        minPartBytes: MULTIPART_MIN_PART_BYTES,
      });
    }

    try {
      const uploadUrl = await getPresignedUploadPartUrl(this.r2, {
        key: input.key,
        uploadId: input.uploadId,
        partNumber: input.partNumber,
        expiresIn: PRESIGN_TTL_SECONDS,
      });
      return {
        uploadUrl,
        partNumber: input.partNumber,
        expiresIn: PRESIGN_TTL_SECONDS,
      };
    } catch (err) {
      throw AppError.internal(err instanceof Error ? err.message : 'Failed to create part URL');
    }
  }

  async completeUpload(input: CompleteUploadInput): Promise<CompleteUploadResult> {
    if (!input.parts.length) {
      throw AppError.validation('parts must not be empty');
    }
    try {
      await completeMultipartUpload(this.r2, input);
    } catch (err) {
      throw AppError.internal(err instanceof Error ? err.message : 'Failed to complete multipart upload');
    }
    return {
      fileUrl: publicObjectUrl(this.r2, input.key)!,
      key: input.key,
    };
  }

  async abortUpload(input: AbortUploadInput): Promise<{ message: string }> {
    try {
      await abortMultipartUpload(this.r2, input);
    } catch (err) {
      throw AppError.internal(err instanceof Error ? err.message : 'Failed to abort multipart upload');
    }
    return { message: 'Multipart upload aborted successfully.' };
  }
}
