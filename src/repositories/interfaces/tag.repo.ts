import type { Tag } from '../../types';

export interface ITagRepository {
  findById(id: string): Promise<Tag | null>;
  findByName(name: string): Promise<Tag | null>;
  findMany(): Promise<Tag[]>;
  findByIds(ids: string[]): Promise<Tag[]>;
  create(data: CreateTagInput): Promise<Tag>;
  update(id: string, data: UpdateTagInput): Promise<Tag>;
  delete(id: string): Promise<void>;
}

export type CreateTagInput = {
  id: string;
  name: string;
  color?: string | null;
};

export type UpdateTagInput = {
  name?: string;
  color?: string | null;
};
