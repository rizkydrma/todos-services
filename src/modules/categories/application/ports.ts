import type { Category } from '../../../types';

export interface ICategoryRepository {
  findById(id: string): Promise<Category | null>;
  findByName(name: string): Promise<Category | null>;
  findMany(): Promise<Category[]>;
  create(data: CreateCategoryInput): Promise<Category>;
  update(id: string, data: UpdateCategoryInput): Promise<Category>;
  delete(id: string): Promise<void>;
}

export interface IdGenerator {
  next(): string;
}

export type CreateCategoryInput = {
  id: string;
  name: string;
  color?: string | null;
};

export type UpdateCategoryInput = {
  name?: string;
  color?: string | null;
};
