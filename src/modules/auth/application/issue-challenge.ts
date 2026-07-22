import type { User } from '../../../types';
import type { AuthDeps } from './deps';

export async function issueChallengeAndSend(deps: AuthDeps, user: User): Promise<void> {
  await deps.challengeRepo.consumeAllActiveForUser(user.id);
  const code = deps.otp.generate();
  const codeHash = await deps.otp.hash(code);
  const expiresAt = new Date(deps.clock.now().getTime() + deps.otp.ttlMs).toISOString();
  await deps.challengeRepo.create({
    id: deps.ids.next(),
    userId: user.id,
    codeHash,
    expiresAt,
  });
  await deps.emailSender.sendEmailVerificationOtp({
    to: user.email,
    code,
    expiresInMinutes: 10,
  });
}
