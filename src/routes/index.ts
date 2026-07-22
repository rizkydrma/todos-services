import type { Hono } from 'hono';
import { createAuthRoutes } from '../modules/auth';
import { createCategoriesRoutes } from '../modules/categories';
import { createTagsRoutes } from '../modules/tags';
import { createTodosRoutes } from '../modules/todos';
import { createUploadsRoutes } from '../modules/uploads';
import { createUsersRoutes } from '../modules/users';
import type { AppEnv } from '../types';

export function registerRoutes(app: Hono<AppEnv>) {
  app.route('/auth', createAuthRoutes());
  app.route('/uploads', createUploadsRoutes());
  app.route('/todos', createTodosRoutes());
  app.route('/categories', createCategoriesRoutes());
  app.route('/tags', createTagsRoutes());
  app.route('/users', createUsersRoutes());
}
