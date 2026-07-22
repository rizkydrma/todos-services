import { AppError } from '../../../platform/errors/app-error';
import type { RegisterPendingVerification } from '../../../types';
import type { AuthDeps } from './deps';
import { issueChallengeAndSend } from './issue-challenge';

export type RegisterInput = { name: string; email: string; password: string };

export function registerWithPassword(deps: AuthDeps) {
  return async (input: RegisterInput): Promise<RegisterPendingVerification> => {
    const email = input.email.trim().toLowerCase();
    const existing = await deps.userRepo.findByEmail(email);
    if (existing) {
      throw AppError.emailAlreadyRegistered('Email already registered');
    }

    const passwordHash = await deps.passwords.hash(input.password);
    const user = await deps.userRepo.create({
      id: deps.ids.next(),
      email,
      name: input.name.trim(),
      role: 'user',
      passwordHash,
      firebaseUid: null,
      emailVerifiedAt: null,
    });

    await issueChallengeAndSend(deps, user);

    return { requiresEmailVerification: true, email };
  };
}
