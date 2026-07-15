import type { IUserRepository } from '../repositories/interfaces/user.repo';
import { AppError } from '../lib/errors';
import type { User, PaginatedResult, PaginationParams } from '../types';

export class UserService {
  constructor(private userRepo: IUserRepository) {}

  async list(params: PaginationParams & { search?: string }): Promise<PaginatedResult<User>> {
    return this.userRepo.findMany(params);
  }

  async getById(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    return user;
  }

  async updateRole(id: string, role: 'user' | 'admin'): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    return this.userRepo.update(id, { role });
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    await this.userRepo.delete(id);
  }
}
