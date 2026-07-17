import type { Hono } from 'hono';
import { authRoutes } from './auth.routes';
import { todosRoutes } from './todos.routes';
import { categoriesRoutes } from './categories.routes';
import { tagsRoutes } from './tags.routes';
import { usersRoutes } from './users.routes';
import type { AppEnv } from '../types';

export function registerRoutes(app: Hono<AppEnv>) {
  app.route('/auth', authRoutes);
  app.route('/todos', todosRoutes);
  app.route('/categories', categoriesRoutes);
  app.route('/tags', tagsRoutes);
  app.route('/users', usersRoutes);
}
