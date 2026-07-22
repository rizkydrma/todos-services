import { createMiddleware } from 'hono/factory';
import { AppError } from '../errors/app-error';
import type { AppEnv } from '../../types';

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    throw AppError.forbidden('Admin access required');
  }
  await next();
});
