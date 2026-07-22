import type { PaginatedResult, PaginationParams, Todo, TodoWithRelations } from '../../../types';

export interface ITodoRepository {
  findById(id: string): Promise<TodoWithRelations | null>;
  findByUserId(input: FindTodosInput & PaginationParams): Promise<PaginatedResult<TodoWithRelations>>;
  create(data: CreateTodoInput): Promise<Todo>;
  update(id: string, data: UpdateTodoInput): Promise<Todo>;
  delete(id: string): Promise<void>;
  deleteCompletedByUserId(userId: string): Promise<number>;
  completeAllByUserId(userId: string): Promise<number>;
}

/** Narrow port — categories module not migrated yet; wire D1CategoryRepository. */
export interface ICategoryReader {
  findById(id: string): Promise<{ id: string } | null>;
}

/** Narrow port — tags module not migrated yet; wire D1TagRepository. */
export interface ITagReader {
  findByIds(ids: string[]): Promise<Array<{ id: string }>>;
}

export interface IdGenerator {
  next(): string;
}

export type FindTodosInput = {
  userId: string;
  status?: 'completed' | 'active';
  categoryId?: string;
  tagId?: string;
  priority?: 'low' | 'medium' | 'high';
  search?: string;
  sort?: 'createdAt' | '-createdAt' | 'dueDate' | '-dueDate' | 'priority' | '-priority';
};

export type CreateTodoInput = {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
};

export type UpdateTodoInput = {
  title?: string;
  description?: string | null;
  completed?: boolean;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string | null;
  categoryId?: string | null;
  tagIds?: string[];
};
