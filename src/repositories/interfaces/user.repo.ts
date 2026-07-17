import type { User } from '../../types';
import type { PaginationParams, PaginatedResult } from '../../types';

export interface IUserRepository {
  findById(id: string): Promise<User | null>;
  findByFirebaseUid(firebaseUid: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findMany(params: PaginationParams & { search?: string }): Promise<PaginatedResult<User>>;
  create(data: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
}

export type CreateUserInput = {
  id: string;
  firebaseUid?: string | null;
  email: string;
  name: string;
  role: 'user' | 'admin';
  passwordHash?: string | null;
};

export type UpdateUserInput = {
  name?: string;
  email?: string;
  role?: 'user' | 'admin';
  firebaseUid?: string | null;
  passwordHash?: string | null;
};
