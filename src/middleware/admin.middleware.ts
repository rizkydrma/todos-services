import { createMiddleware } from 'hono/factory';
import { AppError } from '../lib/errors';
import type { AppEnv } from '../types';

export const adminMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    throw AppError.forbidden('Admin access required');
  }
  await next();
});
