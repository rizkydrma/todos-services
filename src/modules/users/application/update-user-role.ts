import { AppError } from '../../../platform/errors/app-error';
import { toPublicUser, type PublicUser } from '../../../types';
import type { IUserRepository } from './ports';

export function updateUserRole(deps: { userRepo: IUserRepository; r2PublicUrl?: string }) {
  return async (id: string, role: 'user' | 'admin'): Promise<PublicUser> => {
    const user = await deps.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    const updated = await deps.userRepo.update(id, { role });
    return toPublicUser(updated, deps.r2PublicUrl);
  };
}
