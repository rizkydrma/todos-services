import { createMiddleware } from 'hono/factory';
import { AppError } from '../lib/errors';

export const adminMiddleware = createMiddleware<{
  Variables: { user: import('../types').User };
}>(async (c, next) => {
  const user = c.get('user');
  if (!user || user.role !== 'admin') {
    throw AppError.forbidden('Admin access required');
  }
  await next();
});
