import { AppError } from '../../../platform/errors/app-error';
import { PRESIGN_TTL_SECONDS, SINGLE_UPLOAD_MAX_BYTES } from '../../../lib/r2';
import type { GetSingleUrlInput, GetSingleUrlResult, ObjectStorage } from './ports';

export function getSingleUrl(deps: { storage: ObjectStorage }) {
  return async (input: GetSingleUrlInput): Promise<GetSingleUrlResult> => {
    if (input.fileSize <= 0) {
      throw AppError.validation('fileSize must be positive');
    }
    if (input.fileSize > SINGLE_UPLOAD_MAX_BYTES) {
      throw AppError.validation(
        `File too large for single upload (max ${SINGLE_UPLOAD_MAX_BYTES} bytes); use multipart`,
        { maxBytes: SINGLE_UPLOAD_MAX_BYTES },
      );
    }

    const key = deps.storage.buildKey(input.folder, input.fileName);
    const uploadUrl = await deps.storage.getPresignedPutUrl({
      key,
      contentType: input.fileType,
      contentLength: input.fileSize,
      expiresIn: PRESIGN_TTL_SECONDS,
    });

    return {
      uploadUrl,
      fileUrl: deps.storage.publicObjectUrl(key),
      key,
      expiresIn: PRESIGN_TTL_SECONDS,
    };
  };
}
