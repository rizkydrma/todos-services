import { AppError } from '../../../platform/errors/app-error';
import type { PublicUser } from '../../../types';
import type { AuthDeps } from './deps';
import { toPublic } from './to-public';

export function getProfile(deps: AuthDeps) {
  return async (userId: string): Promise<PublicUser> => {
    const user = await deps.userRepo.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }
    return toPublic(deps, user);
  };
}
