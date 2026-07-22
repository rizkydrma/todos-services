import { AppError } from '../../../platform/errors/app-error';
import { toPublicUser, type PublicUser } from '../../../types';
import type { IUserRepository } from './ports';

export function getUser(deps: { userRepo: IUserRepository; r2PublicUrl?: string }) {
  return async (id: string): Promise<PublicUser> => {
    const user = await deps.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    return toPublicUser(user, deps.r2PublicUrl);
  };
}
