import { AppError } from '../../../platform/errors/app-error';
import type { AuthDeps } from './deps';

const RESEND_COOLDOWN_MS = 60 * 1000;
const RESEND_MAX_PER_HOUR = 5;
const RESEND_WINDOW_MS = 60 * 60 * 1000;

export function assertResendAllowed(deps: AuthDeps, email: string): void {
  const now = deps.clock.now().getTime();
  const recent = (deps.resendThrottle.get(email) ?? []).filter((t) => now - t < RESEND_WINDOW_MS);

  if (recent.length > 0) {
    const last = recent[recent.length - 1]!;
    if (now - last < RESEND_COOLDOWN_MS) {
      throw AppError.rateLimited('Please wait before requesting another code');
    }
  }
  if (recent.length >= RESEND_MAX_PER_HOUR) {
    throw AppError.rateLimited('Too many verification emails sent');
  }

  recent.push(now);
  deps.resendThrottle.set(email, recent);
}
