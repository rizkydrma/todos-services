import { getProfile } from './application/get-profile';
import { loginWithGoogle } from './application/login-with-google';
import { loginWithPassword } from './application/login-with-password';
import { logout } from './application/logout';
import { refreshSession } from './application/refresh-session';
import { registerWithPassword } from './application/register-with-password';
import { resendVerification } from './application/resend-verification';
import { resolveAccessUser } from './application/resolve-access-user';
import { updateProfile } from './application/update-profile';
import { verifyEmail } from './application/verify-email';
import type { AuthDeps } from './application/deps';

export type AuthUseCases = {
  register: ReturnType<typeof registerWithPassword>;
  login: ReturnType<typeof loginWithPassword>;
  verifyEmail: ReturnType<typeof verifyEmail>;
  resendVerification: ReturnType<typeof resendVerification>;
  loginWithGoogle: ReturnType<typeof loginWithGoogle>;
  refresh: ReturnType<typeof refreshSession>;
  logout: ReturnType<typeof logout>;
  getProfile: ReturnType<typeof getProfile>;
  updateProfile: ReturnType<typeof updateProfile>;
  resolveAccessUser: ReturnType<typeof resolveAccessUser>;
};

export function buildAuthUseCases(deps: AuthDeps): AuthUseCases {
  return {
    register: registerWithPassword(deps),
    login: loginWithPassword(deps),
    verifyEmail: verifyEmail(deps),
    resendVerification: resendVerification(deps),
    loginWithGoogle: loginWithGoogle(deps),
    refresh: refreshSession(deps),
    logout: logout(deps),
    getProfile: getProfile(deps),
    updateProfile: updateProfile(deps),
    resolveAccessUser: resolveAccessUser(deps),
  };
}

export type { AuthDeps };
