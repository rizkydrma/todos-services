import type { PaginatedResult, PaginationParams, User } from '../../../types';

/** Admin users module reuses the same user persistence port as auth. */
export type { User };

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findMany(params: PaginationParams & { search?: string }): Promise<PaginatedResult<User>>;
  update(id: string, data: { role?: 'user' | 'admin' }): Promise<User>;
  delete(id: string): Promise<void>;
}
