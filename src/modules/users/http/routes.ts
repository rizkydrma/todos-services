import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAdmin } from '../../../platform/auth/require-admin';
import { requireAuth } from '../../../platform/auth/require-auth';
import { success } from '../../../platform/http/envelope';
import type { AppEnv } from '../../../types';
import { updateUserSchema, userQuerySchema } from './schemas';

export function createUsersRoutes() {
  const r = new Hono<AppEnv>();

  r.get('/', requireAuth, requireAdmin, zValidator('query', userQuerySchema), async (c) => {
    const { users } = c.get('container');
    const result = await users.list(c.req.valid('query'));
    return success(c, result.data, result.meta);
  });

  r.get('/:id', requireAuth, requireAdmin, async (c) => {
    const { users } = c.get('container');
    return success(c, await users.get(c.req.param('id')));
  });

  r.patch('/:id', requireAuth, requireAdmin, zValidator('json', updateUserSchema), async (c) => {
    const { users } = c.get('container');
    return success(c, await users.updateRole(c.req.param('id'), c.req.valid('json').role));
  });

  r.delete('/:id', requireAuth, requireAdmin, async (c) => {
    const { users } = c.get('container');
    await users.delete(c.req.param('id'));
    return success(c, { deleted: true });
  });

  return r;
}
