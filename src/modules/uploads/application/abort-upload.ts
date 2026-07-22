import { AppError } from '../../../platform/errors/app-error';
import type { AbortUploadInput, ObjectStorage } from './ports';

export function abortUpload(deps: { storage: ObjectStorage }) {
  return async (input: AbortUploadInput): Promise<{ message: string }> => {
    try {
      await deps.storage.abortMultipartUpload(input);
    } catch (err) {
      throw AppError.internal(err instanceof Error ? err.message : 'Failed to abort multipart upload');
    }
    return { message: 'Multipart upload aborted successfully.' };
  };
}
