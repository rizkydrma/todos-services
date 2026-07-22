import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAdmin } from '../../../platform/auth/require-admin';
import { requireAuth } from '../../../platform/auth/require-auth';
import { created, success } from '../../../platform/http/envelope';
import type { AppEnv } from '../../../types';
import { createTagSchema, updateTagSchema } from './schemas';

export function createTagsRoutes() {
  const r = new Hono<AppEnv>();

  r.get('/', requireAuth, async (c) => {
    const { tags } = c.get('container');
    return success(c, await tags.list());
  });

  r.post('/', requireAuth, requireAdmin, zValidator('json', createTagSchema), async (c) => {
    const { tags } = c.get('container');
    return created(c, await tags.create(c.req.valid('json')));
  });

  r.patch('/:id', requireAuth, requireAdmin, zValidator('json', updateTagSchema), async (c) => {
    const { tags } = c.get('container');
    return success(c, await tags.update({ id: c.req.param('id'), data: c.req.valid('json') }));
  });

  r.delete('/:id', requireAuth, requireAdmin, async (c) => {
    const { tags } = c.get('container');
    await tags.delete({ id: c.req.param('id') });
    return success(c, { deleted: true });
  });

  return r;
}
