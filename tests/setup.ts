import { vi } from 'vitest';
import type { IUserRepository } from '../src/repositories/interfaces/user.repo';
import type { ICategoryRepository } from '../src/repositories/interfaces/category.repo';
import type { ITagRepository } from '../src/repositories/interfaces/tag.repo';
import type { ITodoRepository } from '../src/repositories/interfaces/todo.repo';
import type { User, Category, Tag, Todo } from '../src/types';

// ── Fixtures ──
export const adminUser: User = {
  id: 'admin-uuid-1',
  firebaseUid: 'firebase-admin-uid',
  email: 'rizky.darmarazak@gmail.com',
  name: 'Rizky Darma',
  role: 'admin',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const regularUser: User = {
  id: 'user-uuid-2',
  firebaseUid: 'firebase-user-uid',
  email: 'user@test.com',
  name: 'Regular User',
  role: 'user',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const sampleCategory: Category = {
  id: 'cat-uuid-1',
  name: 'Work',
  color: '#3B82F6',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const sampleTag: Tag = {
  id: 'tag-uuid-1',
  name: 'urgent',
  color: '#EF4444',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const sampleTodo: Todo = {
  id: 'todo-uuid-1',
  userId: adminUser.id,
  title: 'Test Todo',
  description: null,
  completed: false,
  priority: 'medium',
  dueDate: null,
  categoryId: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

// ── Mock Factory ──
export function createMockUserRepo(): IUserRepository {
  return {
    findById: vi.fn(),
    findByFirebaseUid: vi.fn(),
    findByEmail: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockCategoryRepo(): ICategoryRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockTagRepo(): ITagRepository {
  return {
    findById: vi.fn(),
    findByName: vi.fn(),
    findMany: vi.fn(),
    findByIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}

export function createMockTodoRepo(): ITodoRepository {
  return {
    findById: vi.fn(),
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteCompletedByUserId: vi.fn(),
    completeAllByUserId: vi.fn(),
  };
}
