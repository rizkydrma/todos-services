import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAdmin } from '../../../platform/auth/require-admin';
import { requireAuth } from '../../../platform/auth/require-auth';
import { created, success } from '../../../platform/http/envelope';
import type { AppEnv } from '../../../types';
import { createCategorySchema, updateCategorySchema } from './schemas';

export function createCategoriesRoutes() {
  const r = new Hono<AppEnv>();

  r.get('/', requireAuth, async (c) => {
    const { categories } = c.get('container');
    return success(c, await categories.list());
  });

  r.post('/', requireAuth, requireAdmin, zValidator('json', createCategorySchema), async (c) => {
    const { categories } = c.get('container');
    return created(c, await categories.create(c.req.valid('json')));
  });

  r.patch('/:id', requireAuth, requireAdmin, zValidator('json', updateCategorySchema), async (c) => {
    const { categories } = c.get('container');
    return success(c, await categories.update({ id: c.req.param('id'), data: c.req.valid('json') }));
  });

  r.delete('/:id', requireAuth, requireAdmin, async (c) => {
    const { categories } = c.get('container');
    await categories.delete({ id: c.req.param('id') });
    return success(c, { deleted: true });
  });

  return r;
}
