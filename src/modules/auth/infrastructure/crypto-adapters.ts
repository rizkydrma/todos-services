import { hashPassword, verifyPassword } from '../../../lib/password';
import { generateOtpCode, hashOtp, OTP_MAX_ATTEMPTS, OTP_TTL_MS, verifyOtp } from '../../../lib/otp';
import type { Clock, IdGenerator, OtpService, PasswordHasher } from '../application/ports';
import { uuidIdGenerator } from '../../../shared/ports/id-generator';

export const defaultPasswordHasher: PasswordHasher = {
  hash: hashPassword,
  verify: verifyPassword,
};

export const defaultOtpService: OtpService = {
  generate: generateOtpCode,
  hash: hashOtp,
  verify: verifyOtp,
  ttlMs: OTP_TTL_MS,
  maxAttempts: OTP_MAX_ATTEMPTS,
};

export const systemClock: Clock = {
  now: () => new Date(),
};

export const defaultIdGenerator: IdGenerator = uuidIdGenerator;
