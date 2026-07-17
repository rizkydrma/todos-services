import type { DbClient } from '../db';
import { D1UserRepository } from './d1/user.repo';
import { D1CategoryRepository } from './d1/category.repo';
import { D1TagRepository } from './d1/tag.repo';
import { D1TodoRepository } from './d1/todo.repo';
import { D1RefreshTokenRepository } from './d1/refresh-token.repo';

export function createRepositories(db: DbClient) {
  return {
    users: new D1UserRepository(db),
    categories: new D1CategoryRepository(db),
    tags: new D1TagRepository(db),
    todos: new D1TodoRepository(db),
    refreshTokens: new D1RefreshTokenRepository(db),
  };
}

export type Repositories = ReturnType<typeof createRepositories>;
