import { vi } from 'vitest';
import type { User, Category, Tag, Todo, PaginationParams, PaginatedResult, TodoWithRelations } from '../src/types';
import type { CreateUserInput, UpdateUserInput } from '../src/repositories/interfaces/user.repo';
import type { CreateTodoInput, UpdateTodoInput, FindTodosInput } from '../src/repositories/interfaces/todo.repo';
import type { CreateRefreshTokenInput, RefreshTokenRecord } from '../src/repositories/interfaces/refresh-token.repo';

// ── Fixtures ──
export const adminUser: User = {
  id: 'admin-uuid-1',
  firebaseUid: 'firebase-admin-uid',
  email: 'rizky.darmarazak@gmail.com',
  name: 'Rizky Darma',
  role: 'admin',
  passwordHash: 'pbkdf2$100000$dGVzdA==$dGVzdA==',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

export const regularUser: User = {
  id: 'user-uuid-2',
  firebaseUid: null,
  email: 'user@test.com',
  name: 'Regular User',
  role: 'user',
  passwordHash: null,
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
export function createMockUserRepo() {
  return {
    findById: vi.fn<(id: string) => Promise<User | null>>(),
    findByFirebaseUid: vi.fn<(firebaseUid: string) => Promise<User | null>>(),
    findByEmail: vi.fn<(email: string) => Promise<User | null>>(),
    findMany: vi.fn<(p: PaginationParams & { search?: string }) => Promise<PaginatedResult<User>>>(),
    create: vi.fn<(data: CreateUserInput) => Promise<User>>(),
    update: vi.fn<(id: string, data: UpdateUserInput) => Promise<User>>(),
    delete: vi.fn<(id: string) => Promise<void>>(),
  };
}

export function createMockRefreshTokenRepo() {
  return {
    create: vi.fn<(data: CreateRefreshTokenInput) => Promise<RefreshTokenRecord>>(),
    findByJti: vi.fn<(jti: string) => Promise<RefreshTokenRecord | null>>(),
    revokeByJti: vi.fn<(jti: string) => Promise<void>>(),
    revokeAllForUser: vi.fn<(userId: string) => Promise<void>>(),
  };
}

export function createMockCategoryRepo() {
  return {
    findById: vi.fn<(id: string) => Promise<Category | null>>(),
    findByName: vi.fn<(name: string) => Promise<Category | null>>(),
    findMany: vi.fn<() => Promise<Category[]>>(),
    create: vi.fn<(data: { id: string; name: string; color?: string | null }) => Promise<Category>>(),
    update: vi.fn<(id: string, data: { name?: string; color?: string | null }) => Promise<Category>>(),
    delete: vi.fn<(id: string) => Promise<void>>(),
  };
}

export function createMockTagRepo() {
  return {
    findById: vi.fn<(id: string) => Promise<Tag | null>>(),
    findByName: vi.fn<(name: string) => Promise<Tag | null>>(),
    findMany: vi.fn<() => Promise<Tag[]>>(),
    findByIds: vi.fn<(ids: string[]) => Promise<Tag[]>>(),
    create: vi.fn<(data: { id: string; name: string; color?: string | null }) => Promise<Tag>>(),
    update: vi.fn<(id: string, data: { name?: string; color?: string | null }) => Promise<Tag>>(),
    delete: vi.fn<(id: string) => Promise<void>>(),
  };
}

export function createMockTodoRepo() {
  return {
    findById: vi.fn<(id: string) => Promise<TodoWithRelations | null>>(),
    findByUserId: vi.fn<(i: FindTodosInput & PaginationParams) => Promise<PaginatedResult<TodoWithRelations>>>(),
    create: vi.fn<(data: CreateTodoInput) => Promise<Todo>>(),
    update: vi.fn<(id: string, data: UpdateTodoInput) => Promise<Todo>>(),
    delete: vi.fn<(id: string) => Promise<void>>(),
    deleteCompletedByUserId: vi.fn<(userId: string) => Promise<number>>(),
    completeAllByUserId: vi.fn<(userId: string) => Promise<number>>(),
  };
}
