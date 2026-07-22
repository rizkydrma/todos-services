import { toPublicUser, type PaginatedResult, type PaginationParams, type PublicUser } from '../../../types';
import type { IUserRepository } from './ports';

export function listUsers(deps: { userRepo: IUserRepository; r2PublicUrl?: string }) {
  return async (params: PaginationParams & { search?: string }): Promise<PaginatedResult<PublicUser>> => {
    const result = await deps.userRepo.findMany(params);
    return {
      ...result,
      data: result.data.map((u) => toPublicUser(u, deps.r2PublicUrl)),
    };
  };
}
