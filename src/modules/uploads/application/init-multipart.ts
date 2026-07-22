import { AppError } from '../../../platform/errors/app-error';
import { MULTIPART_MAX_BYTES } from '../../../lib/r2';
import type { InitMultipartInput, InitMultipartResult, ObjectStorage } from './ports';

export function initMultipart(deps: { storage: ObjectStorage }) {
  return async (input: InitMultipartInput): Promise<InitMultipartResult> => {
    if (input.fileSize <= 0) {
      throw AppError.validation('fileSize must be positive');
    }
    if (input.fileSize > MULTIPART_MAX_BYTES) {
      throw AppError.validation(`File exceeds multipart maximum of ${MULTIPART_MAX_BYTES} bytes`);
    }

    const key = deps.storage.buildKey(input.folder, input.fileName);
    try {
      const uploadId = await deps.storage.initMultipartUpload({
        key,
        contentType: input.fileType,
      });
      return { uploadId, key };
    } catch (err) {
      throw AppError.internal(err instanceof Error ? err.message : 'Failed to init multipart upload');
    }
  };
}
