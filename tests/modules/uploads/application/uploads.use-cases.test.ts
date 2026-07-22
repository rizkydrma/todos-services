import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildUploadsUseCases, type UploadsUseCases } from '../../../../src/modules/uploads';
import { R2ObjectStorage } from '../../../../src/modules/uploads/infrastructure/r2-object-storage';
import * as r2 from '../../../../src/lib/r2';

const TEST_R2 = {
  R2_ACCOUNT_ID: 'acct',
  R2_ACCESS_KEY_ID: 'key',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET_NAME: 'todo-bucket',
  R2_PUBLIC_URL: 'https://cdn.example.com',
};

describe('uploads use cases', () => {
  let uploads: UploadsUseCases;

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(r2, 'getPresignedPutUrl').mockResolvedValue('https://r2.example/presigned-put');
    vi.spyOn(r2, 'getPresignedUploadPartUrl').mockResolvedValue('https://r2.example/presigned-part');
    vi.spyOn(r2, 'initMultipartUpload').mockResolvedValue('upload-id-1');
    vi.spyOn(r2, 'completeMultipartUpload').mockResolvedValue(undefined);
    vi.spyOn(r2, 'abortMultipartUpload').mockResolvedValue(undefined);
    uploads = buildUploadsUseCases({ storage: new R2ObjectStorage(TEST_R2) });
  });

  describe('getSingleUrl', () => {
    it('returns presigned URL, public fileUrl, and key', async () => {
      const result = await uploads.getSingleUrl({
        fileName: 'foto-proyek.jpg',
        fileType: 'image/jpeg',
        folder: 'avatars',
        fileSize: 1024,
      });

      expect(result.uploadUrl).toBe('https://r2.example/presigned-put');
      expect(result.expiresIn).toBe(3600);
      expect(result.key).toMatch(/^avatars\/\d+_foto-proyek\.jpg$/);
      expect(result.fileUrl).toBe(`https://cdn.example.com/${result.key}`);
      expect(r2.getPresignedPutUrl).toHaveBeenCalledWith(
        TEST_R2,
        expect.objectContaining({
          key: result.key,
          contentType: 'image/jpeg',
          contentLength: 1024,
        }),
      );
    });

    it('rejects files larger than 50MB for single upload', async () => {
      await expect(
        uploads.getSingleUrl({
          fileName: 'big.bin',
          fileType: 'application/octet-stream',
          fileSize: 50 * 1024 * 1024 + 1,
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('initMultipart', () => {
    it('returns uploadId and key', async () => {
      const result = await uploads.initMultipart({
        fileName: 'video.mp4',
        fileType: 'video/mp4',
        fileSize: 100 * 1024 * 1024,
      });

      expect(result.uploadId).toBe('upload-id-1');
      expect(result.key).toMatch(/^uploads\/\d+_video\.mp4$/);
    });
  });

  describe('getPartUrl', () => {
    it('returns part presigned URL', async () => {
      const result = await uploads.getPartUrl({
        key: 'uploads/1_video.mp4',
        uploadId: 'upload-id-1',
        partNumber: 1,
        partSize: 50 * 1024 * 1024,
      });

      expect(result.uploadUrl).toBe('https://r2.example/presigned-part');
      expect(result.partNumber).toBe(1);
      expect(result.expiresIn).toBe(3600);
    });

    it('rejects non-final parts smaller than 5MB', async () => {
      await expect(
        uploads.getPartUrl({
          key: 'uploads/1_video.mp4',
          uploadId: 'upload-id-1',
          partNumber: 1,
          partSize: 1024,
          isLastPart: false,
        }),
      ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    });
  });

  describe('completeUpload', () => {
    it('returns public fileUrl', async () => {
      const result = await uploads.completeUpload({
        key: 'uploads/1_video.mp4',
        uploadId: 'upload-id-1',
        parts: [{ PartNumber: 1, ETag: '"etag1"' }],
      });

      expect(result.key).toBe('uploads/1_video.mp4');
      expect(result.fileUrl).toBe('https://cdn.example.com/uploads/1_video.mp4');
      expect(r2.completeMultipartUpload).toHaveBeenCalled();
    });
  });

  describe('abortUpload', () => {
    it('returns success message', async () => {
      const result = await uploads.abortUpload({
        key: 'uploads/1_video.mp4',
        uploadId: 'upload-id-1',
      });
      expect(result.message).toMatch(/aborted/i);
    });
  });
});
