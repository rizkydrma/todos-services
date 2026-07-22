import { abortUpload } from './application/abort-upload';
import { completeUpload } from './application/complete-upload';
import { getPartUrl } from './application/get-part-url';
import { getSingleUrl } from './application/get-single-url';
import { initMultipart } from './application/init-multipart';
import type { ObjectStorage } from './application/ports';

export type UploadsUseCases = {
  getSingleUrl: ReturnType<typeof getSingleUrl>;
  initMultipart: ReturnType<typeof initMultipart>;
  getPartUrl: ReturnType<typeof getPartUrl>;
  completeUpload: ReturnType<typeof completeUpload>;
  abortUpload: ReturnType<typeof abortUpload>;
};

export function buildUploadsUseCases(deps: { storage: ObjectStorage }): UploadsUseCases {
  return {
    getSingleUrl: getSingleUrl({ storage: deps.storage }),
    initMultipart: initMultipart({ storage: deps.storage }),
    getPartUrl: getPartUrl({ storage: deps.storage }),
    completeUpload: completeUpload({ storage: deps.storage }),
    abortUpload: abortUpload({ storage: deps.storage }),
  };
}
