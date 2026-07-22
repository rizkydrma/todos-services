import { createEmailSender } from '../../lib/email/sender';
import type { R2Env } from '../../lib/r2';
import type { DbClient } from '../../db';
import type { AuthDeps } from './application/deps';
import {
  defaultIdGenerator,
  defaultOtpService,
  defaultPasswordHasher,
  systemClock,
} from './infrastructure/crypto-adapters';
import { D1EmailVerificationChallengeRepository } from './infrastructure/d1-email-verification-challenge.repository';
import { D1RefreshTokenRepository } from './infrastructure/d1-refresh-token.repository';
import { D1UserRepository } from './infrastructure/d1-user.repository';
import { JwtTokenService } from './infrastructure/jwt-token.service';
import { createAvatarStore } from './infrastructure/r2-avatar-store';
import { isolateResendThrottle } from './infrastructure/resend-throttle';
import type {
  EmailSender,
  IEmailVerificationChallengeRepository,
  IRefreshTokenRepository,
  IUserRepository,
} from './application/ports';

export type BuildAuthDepsInput = {
  db: DbClient;
  jwtSecret: string;
  emailEnv: { EMAIL_PROVIDER?: string; RESEND_API_KEY?: string; EMAIL_FROM?: string };
  r2?: R2Env;
  /** Override for tests; defaults to isolate-scoped Map */
  resendThrottle?: Map<string, number[]>;
  userRepo?: IUserRepository;
  refreshTokenRepo?: IRefreshTokenRepository;
  challengeRepo?: IEmailVerificationChallengeRepository;
  emailSender?: EmailSender;
};

export function buildAuthDeps(input: BuildAuthDepsInput): AuthDeps {
  return {
    userRepo: input.userRepo ?? new D1UserRepository(input.db),
    refreshTokenRepo: input.refreshTokenRepo ?? new D1RefreshTokenRepository(input.db),
    challengeRepo: input.challengeRepo ?? new D1EmailVerificationChallengeRepository(input.db),
    emailSender: input.emailSender ?? createEmailSender(input.emailEnv),
    tokens: new JwtTokenService(input.jwtSecret),
    passwords: defaultPasswordHasher,
    otp: defaultOtpService,
    ids: defaultIdGenerator,
    clock: systemClock,
    resendThrottle: input.resendThrottle ?? isolateResendThrottle,
    avatarStore: createAvatarStore(input.r2),
  };
}
