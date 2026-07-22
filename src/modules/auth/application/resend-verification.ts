import type { AuthDeps } from './deps';
import { assertResendAllowed } from './assert-resend-allowed';
import { issueChallengeAndSend } from './issue-challenge';

export function resendVerification(deps: AuthDeps) {
  return async (email: string): Promise<{ ok: true }> => {
    const normalized = email.trim().toLowerCase();
    assertResendAllowed(deps, normalized);

    const user = await deps.userRepo.findByEmail(normalized);
    if (!user || user.emailVerifiedAt) {
      return { ok: true };
    }

    await issueChallengeAndSend(deps, user);
    return { ok: true };
  };
}
