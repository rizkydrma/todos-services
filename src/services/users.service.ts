import type { IUserRepository } from '../repositories/interfaces/user.repo';
import { AppError } from '../lib/errors';
import type { PublicUser, PaginatedResult, PaginationParams } from '../types';
import { toPublicUser } from '../types';

export class UserService {
  constructor(private userRepo: IUserRepository) {}

  async list(params: PaginationParams & { search?: string }): Promise<PaginatedResult<PublicUser>> {
    const result = await this.userRepo.findMany(params);
    return {
      ...result,
      data: result.data.map(toPublicUser),
    };
  }

  async getById(id: string): Promise<PublicUser> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    return toPublicUser(user);
  }

  async updateRole(id: string, role: 'user' | 'admin'): Promise<PublicUser> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    const updated = await this.userRepo.update(id, { role });
    return toPublicUser(updated);
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    await this.userRepo.delete(id);
  }
}
