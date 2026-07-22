import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { requireAuth } from '../../../platform/auth/require-auth';
import { success, created } from '../../../platform/http/envelope';
import type { AppEnv } from '../../../types';
import { batchTodoSchema, createTodoSchema, todoQuerySchema, updateTodoSchema } from './schemas';

export function createTodosRoutes() {
  const r = new Hono<AppEnv>();

  r.get('/', requireAuth, zValidator('query', todoQuerySchema), async (c) => {
    const { todos } = c.get('container');
    const user = c.get('user');
    const query = c.req.valid('query');

    const result = await todos.list({
      ...query,
      userId: user.id,
      categoryId: query.category,
      tagId: query.tag,
    });

    return success(c, result.data, result.meta);
  });

  r.post('/', requireAuth, zValidator('json', createTodoSchema), async (c) => {
    const { todos } = c.get('container');
    const user = c.get('user');
    const todo = await todos.create({ userId: user.id, data: c.req.valid('json') });
    return created(c, todo);
  });

  r.get('/:id', requireAuth, async (c) => {
    const { todos } = c.get('container');
    const user = c.get('user');
    const todo = await todos.get({ id: c.req.param('id'), userId: user.id });
    return success(c, todo);
  });

  r.patch('/:id', requireAuth, zValidator('json', updateTodoSchema), async (c) => {
    const { todos } = c.get('container');
    const user = c.get('user');
    const todo = await todos.update({
      id: c.req.param('id'),
      userId: user.id,
      data: c.req.valid('json'),
    });
    return success(c, todo);
  });

  r.delete('/:id', requireAuth, async (c) => {
    const { todos } = c.get('container');
    const user = c.get('user');
    await todos.delete({ id: c.req.param('id'), userId: user.id });
    return success(c, { deleted: true });
  });

  r.patch('/batch', requireAuth, zValidator('json', batchTodoSchema), async (c) => {
    const { todos } = c.get('container');
    const user = c.get('user');
    const result = await todos.batch({
      userId: user.id,
      action: c.req.valid('json').action,
    });
    return success(c, result);
  });

  return r;
}
