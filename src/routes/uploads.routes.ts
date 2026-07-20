import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import {
  abortUploadSchema,
  completeUploadSchema,
  getPartUrlSchema,
  getSingleUrlSchema,
  initMultipartSchema,
} from '../types/schemas';
import { UploadsService } from '../services/uploads.service';
import { success } from '../lib/response';
import { AppError } from '../lib/errors';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireR2Env, type R2Env } from '../lib/r2';
import type { AppEnv } from '../types';

const uploadsRoutes = new Hono<AppEnv>();

function r2FromEnv(env: AppEnv['Bindings']): R2Env {
  try {
    return requireR2Env(env);
  } catch {
    throw AppError.internal('R2 is not configured');
  }
}

function createUploadsService(env: AppEnv['Bindings']) {
  return new UploadsService(r2FromEnv(env));
}

uploadsRoutes.use('*', authMiddleware);

uploadsRoutes.post('/get-single-url', zValidator('json', getSingleUrlSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await createUploadsService(c.env).getSingleUrl(body);
  return success(c, result);
});

uploadsRoutes.post('/init-multipart', zValidator('json', initMultipartSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await createUploadsService(c.env).initMultipart(body);
  return success(c, result);
});

uploadsRoutes.post('/get-part-url', zValidator('json', getPartUrlSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await createUploadsService(c.env).getPartUrl(body);
  return success(c, result);
});

uploadsRoutes.post('/complete-upload', zValidator('json', completeUploadSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await createUploadsService(c.env).completeUpload(body);
  return success(c, result);
});

uploadsRoutes.post('/abort-upload', zValidator('json', abortUploadSchema), async (c) => {
  const body = c.req.valid('json');
  const result = await createUploadsService(c.env).abortUpload(body);
  return success(c, result);
});

export { uploadsRoutes };
