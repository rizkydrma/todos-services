import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { updateUserSchema, userQuerySchema } from '../types/schemas';
import { createDb } from '../db';
import { D1UserRepository } from '../repositories/d1/user.repo';
import { UserService } from '../services/users.service';
import { success } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const usersRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

usersRoutes.get('/', authMiddleware, adminMiddleware, zValidator('query', userQuerySchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new UserService(new D1UserRepository(db));
  const result = await service.list(c.req.valid('query'));
  return success(c, result.data, result.meta);
});

usersRoutes.get('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new UserService(new D1UserRepository(db));
  return success(c, await service.getById(c.req.param('id')));
});

usersRoutes.patch('/:id', authMiddleware, adminMiddleware, zValidator('json', updateUserSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new UserService(new D1UserRepository(db));
  return success(c, await service.updateRole(c.req.param('id'), c.req.valid('json').role));
});

usersRoutes.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new UserService(new D1UserRepository(db));
  await service.delete(c.req.param('id'));
  return success(c, { deleted: true });
});

export { usersRoutes };
