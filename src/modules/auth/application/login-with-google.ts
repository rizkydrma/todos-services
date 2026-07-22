import { AppError } from '../../../platform/errors/app-error';
import type { AuthSession } from '../../../types';
import type { AuthDeps } from './deps';
import { issueSession } from './issue-session';

export type GoogleLoginInput = {
  firebaseUid: string;
  email: string;
  name?: string;
  emailVerified: boolean;
};

export function loginWithGoogle(deps: AuthDeps) {
  return async (decoded: GoogleLoginInput): Promise<AuthSession> => {
    if (!decoded.email?.trim()) {
      throw AppError.unauthorized('Google token missing email');
    }
    if (!decoded.emailVerified) {
      throw AppError.unauthorized('Google email not verified');
    }

    const email = decoded.email.trim().toLowerCase();

    let user = await deps.userRepo.findByFirebaseUid(decoded.firebaseUid);
    if (user) {
      if (!user.emailVerifiedAt) {
        user = await deps.userRepo.update(user.id, {
          emailVerifiedAt: deps.clock.now().toISOString(),
        });
      }
      return issueSession(deps, user);
    }

    const byEmail = await deps.userRepo.findByEmail(email);
    if (byEmail) {
      if (byEmail.firebaseUid && byEmail.firebaseUid !== decoded.firebaseUid) {
        throw AppError.identityConflict('Account exists with different Google identity');
      }
      throw AppError.emailRegisteredUsePassword('Email already registered; use password login');
    }

    user = await deps.userRepo.create({
      id: deps.ids.next(),
      email,
      name: decoded.name?.trim() || email.split('@')[0] || 'User',
      role: 'user',
      firebaseUid: decoded.firebaseUid,
      passwordHash: null,
      emailVerifiedAt: deps.clock.now().toISOString(),
    });

    return issueSession(deps, user);
  };
}
