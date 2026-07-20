import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateUserSchema, userQuerySchema } from '../types/schemas';
import { createDb } from '../db';
import { D1UserRepository } from '../repositories/d1/user.repo';
import { UserService } from '../services/users.service';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import type { AppEnv } from '../types';

const usersRoutes = new Hono<AppEnv>();

function createUserService(c: { env: AppEnv['Bindings'] }) {
  const db = createDb(c.env.DB);
  return new UserService(new D1UserRepository(db), c.env.R2_PUBLIC_URL);
}

usersRoutes.get('/', authMiddleware, adminMiddleware, zValidator('query', userQuerySchema), async (c) => {
  const result = await createUserService(c).list(c.req.valid('query'));
  return success(c, result.data, result.meta);
});

usersRoutes.get('/:id', authMiddleware, adminMiddleware, async (c) => {
  return success(c, await createUserService(c).getById(c.req.param('id')));
});

usersRoutes.patch('/:id', authMiddleware, adminMiddleware, zValidator('json', updateUserSchema), async (c) => {
  return success(c, await createUserService(c).updateRole(c.req.param('id'), c.req.valid('json').role));
});

usersRoutes.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  await createUserService(c).delete(c.req.param('id'));
  return success(c, { deleted: true });
});

export { usersRoutes };
