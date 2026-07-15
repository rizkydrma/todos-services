import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { createTodoSchema, updateTodoSchema, todoQuerySchema, batchTodoSchema } from '../types/schemas';
import { createDb } from '../db';
import { D1TodoRepository } from '../repositories/d1/todo.repo';
import { D1CategoryRepository } from '../repositories/d1/category.repo';
import { D1TagRepository } from '../repositories/d1/tag.repo';
import { TodoService } from '../services/todos.service';
import { success, created } from '../lib/response';
import { authMiddleware } from '../middleware/auth.middleware';
import type { DbClient } from '../db';

const todosRoutes = new Hono<{ Bindings: { DB: D1Database } }>();

function createService(db: DbClient) {
  return new TodoService(
    new D1TodoRepository(db),
    new D1CategoryRepository(db),
    new D1TagRepository(db),
  );
}

todosRoutes.get('/', authMiddleware, zValidator('query', todoQuerySchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');
  const query = c.req.valid('query');

  const result = await service.list(user.id, {
    ...query,
    userId: user.id,
    categoryId: query.category,
    tagId: query.tag,
  });

  return success(c, result.data, result.meta);
});

todosRoutes.post('/', authMiddleware, zValidator('json', createTodoSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  const todo = await service.create(user.id, c.req.valid('json'));
  return created(c, todo);
});

todosRoutes.get('/:id', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  const todo = await service.getById(c.req.param('id'), user.id);
  return success(c, todo);
});

todosRoutes.patch('/:id', authMiddleware, zValidator('json', updateTodoSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  const todo = await service.update(c.req.param('id'), user.id, c.req.valid('json'));
  return success(c, todo);
});

todosRoutes.delete('/:id', authMiddleware, async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  await service.delete(c.req.param('id'), user.id);
  return success(c, { deleted: true });
});

todosRoutes.patch('/batch', authMiddleware, zValidator('json', batchTodoSchema), async (c) => {
  const db = createDb(c.env.DB);
  const service = createService(db);
  const user = c.get('user');

  const result = await service.batch(user.id, c.req.valid('json').action);
  return success(c, result);
});

export { todosRoutes };
