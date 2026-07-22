import { AppError } from '../../../platform/errors/app-error';
import type { CompleteUploadInput, CompleteUploadResult, ObjectStorage } from './ports';

export function completeUpload(deps: { storage: ObjectStorage }) {
  return async (input: CompleteUploadInput): Promise<CompleteUploadResult> => {
    if (!input.parts.length) {
      throw AppError.validation('parts must not be empty');
    }
    try {
      await deps.storage.completeMultipartUpload(input);
    } catch (err) {
      throw AppError.internal(err instanceof Error ? err.message : 'Failed to complete multipart upload');
    }
    return {
      fileUrl: deps.storage.publicObjectUrl(input.key),
      key: input.key,
    };
  };
}
