import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../../../platform/auth/require-auth';
import { success } from '../../../platform/http/envelope';
import type { AppEnv } from '../../../types';
import {
  abortUploadSchema,
  completeUploadSchema,
  getPartUrlSchema,
  getSingleUrlSchema,
  initMultipartSchema,
} from './schemas';

export function createUploadsRoutes() {
  const r = new Hono<AppEnv>();

  r.use('*', requireAuth);

  r.post('/get-single-url', zValidator('json', getSingleUrlSchema), async (c) => {
    const { uploads } = c.get('container');
    return success(c, await uploads.getSingleUrl(c.req.valid('json')));
  });

  r.post('/init-multipart', zValidator('json', initMultipartSchema), async (c) => {
    const { uploads } = c.get('container');
    return success(c, await uploads.initMultipart(c.req.valid('json')));
  });

  r.post('/get-part-url', zValidator('json', getPartUrlSchema), async (c) => {
    const { uploads } = c.get('container');
    return success(c, await uploads.getPartUrl(c.req.valid('json')));
  });

  r.post('/complete-upload', zValidator('json', completeUploadSchema), async (c) => {
    const { uploads } = c.get('container');
    return success(c, await uploads.completeUpload(c.req.valid('json')));
  });

  r.post('/abort-upload', zValidator('json', abortUploadSchema), async (c) => {
    const { uploads } = c.get('container');
    return success(c, await uploads.abortUpload(c.req.valid('json')));
  });

  return r;
}
