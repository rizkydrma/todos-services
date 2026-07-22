import { AppError } from '../../../platform/errors/app-error';
import type { PublicUser } from '../../../types';
import type { AuthDeps } from './deps';
import { toPublic } from './to-public';

/** Bearer access JWT → PublicUser (for requireAuth middleware). */
export function resolveAccessUser(deps: AuthDeps) {
  return async (accessToken: string): Promise<PublicUser> => {
    try {
      const payload = await deps.tokens.verifyAccess(accessToken);
      const user = await deps.userRepo.findById(payload.sub);
      if (!user) throw AppError.unauthorized('User not found');
      return toPublic(deps, user);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw AppError.unauthorized('Invalid or expired token');
    }
  };
}
