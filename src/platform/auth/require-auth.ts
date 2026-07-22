import { createMiddleware } from 'hono/factory';
import { AppError } from '../errors/app-error';
import type { AppEnv } from '../../types';

/**
 * Bearer access JWT → load PublicUser into context via container.auth.
 */
export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);
  const { auth } = c.get('container');

  try {
    const user = await auth.resolveAccessUser(token);
    c.set('user', user);
    await next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Invalid or expired token');
  }
});
