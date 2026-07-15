import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createCategorySchema, updateCategorySchema } from '../types/schemas';
import { createDb } from '../db';
import { D1CategoryRepository } from '../repositories/d1/category.repo';
import { CategoryService } from '../services/categories.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';

const categoriesRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

categoriesRoutes.get('/', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new CategoryService(new D1CategoryRepository(db));
  return success(c, await service.list());
});

categoriesRoutes.post('/', authMiddleware, adminMiddleware, zValidator('json', createCategorySchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new CategoryService(new D1CategoryRepository(db));
  return created(c, await service.create(c.req.valid('json')));
});

categoriesRoutes.patch('/:id', authMiddleware, adminMiddleware, zValidator('json', updateCategorySchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new CategoryService(new D1CategoryRepository(db));
  return success(c, await service.update(c.req.param('id'), c.req.valid('json')));
});

categoriesRoutes.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new CategoryService(new D1CategoryRepository(db));
  await service.delete(c.req.param('id'));
  return success(c, { deleted: true });
});

export { categoriesRoutes };
