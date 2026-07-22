import { AppError } from '../../../platform/errors/app-error';
import type { AuthSession } from '../../../types';
import type { AuthDeps } from './deps';
import { issueSession } from './issue-session';

export type LoginInput = { email: string; password: string };

export function loginWithPassword(deps: AuthDeps) {
  return async (input: LoginInput): Promise<AuthSession> => {
    const email = input.email.trim().toLowerCase();
    const user = await deps.userRepo.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid credentials');
    }

    const ok = await deps.passwords.verify(input.password, user.passwordHash);
    if (!ok) {
      throw AppError.unauthorized('Invalid credentials');
    }

    if (!user.emailVerifiedAt) {
      throw AppError.emailNotVerified('Email not verified');
    }

    return issueSession(deps, user);
  };
}
