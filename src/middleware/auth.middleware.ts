import { createMiddleware } from 'hono/factory';
import { verifyAccessToken } from '../lib/jwt';
import { AppError } from '../lib/errors';
import { createDb } from '../db';
import { D1UserRepository } from '../repositories/d1/user.repo';
import { toPublicUser, type AppEnv } from '../types';

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing or invalid Authorization header');
  }

  const token = authHeader.slice(7);

  try {
    const payload = await verifyAccessToken(token, c.env.JWT_SECRET);
    const db = createDb(c.env.DB);
    const userRepo = new D1UserRepository(db);
    const user = await userRepo.findById(payload.sub);

    if (!user) throw AppError.unauthorized('User not found');

    c.set('user', toPublicUser(user));
    await next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.unauthorized('Invalid or expired token');
  }
});
