import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createTagSchema, updateTagSchema } from '../types/schemas';
import { createDb } from '../db';
import { D1TagRepository } from '../repositories/d1/tag.repo';
import { TagService } from '../services/tags.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import { adminMiddleware } from '../middleware/admin.middleware';
import type { AppEnv } from '../types';

const tagsRoutes = new Hono<AppEnv>();

tagsRoutes.get('/', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new TagService(new D1TagRepository(db));
  return success(c, await service.list());
});

tagsRoutes.post('/', authMiddleware, adminMiddleware, zValidator('json', createTagSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new TagService(new D1TagRepository(db));
  return created(c, await service.create(c.req.valid('json')));
});

tagsRoutes.patch('/:id', authMiddleware, adminMiddleware, zValidator('json', updateTagSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = new TagService(new D1TagRepository(db));
  return success(c, await service.update(c.req.param('id'), c.req.valid('json')));
});

tagsRoutes.delete('/:id', authMiddleware, adminMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = new TagService(new D1TagRepository(db));
  await service.delete(c.req.param('id'));
  return success(c, { deleted: true });
});

export { tagsRoutes };
