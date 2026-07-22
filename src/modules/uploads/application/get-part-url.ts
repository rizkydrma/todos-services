import { AppError } from '../../../platform/errors/app-error';
import { MULTIPART_MIN_PART_BYTES, PRESIGN_TTL_SECONDS } from '../../../lib/r2';
import type { GetPartUrlInput, GetPartUrlResult, ObjectStorage } from './ports';

export function getPartUrl(deps: { storage: ObjectStorage }) {
  return async (input: GetPartUrlInput): Promise<GetPartUrlResult> => {
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
      const uploadUrl = await deps.storage.getPresignedUploadPartUrl({
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
  };
}
