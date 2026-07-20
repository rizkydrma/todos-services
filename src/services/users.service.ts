import type { IUserRepository } from '../repositories/interfaces/user.repo';
import { AppError } from '../lib/errors';
import type { PublicUser, PaginatedResult, PaginationParams } from '../types';
import { toPublicUser } from '../types';

export class UserService {
  constructor(
    private userRepo: IUserRepository,
    private r2PublicUrl?: string,
  ) {}

  async list(params: PaginationParams & { search?: string }): Promise<PaginatedResult<PublicUser>> {
    const result = await this.userRepo.findMany(params);
    return {
      ...result,
      data: result.data.map((u) => toPublicUser(u, this.r2PublicUrl)),
    };
  }

  async getById(id: string): Promise<PublicUser> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    return toPublicUser(user, this.r2PublicUrl);
  }

  async updateRole(id: string, role: 'user' | 'admin'): Promise<PublicUser> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    const updated = await this.userRepo.update(id, { role });
    return toPublicUser(updated, this.r2PublicUrl);
  }

  async delete(id: string): Promise<void> {
    const user = await this.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    await this.userRepo.delete(id);
  }
}
