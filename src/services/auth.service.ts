import { v4 as uuidv4 } from 'uuid';
import type { IUserRepository } from '../repositories/interfaces/user.repo';
import type { IRefreshTokenRepository } from '../repositories/interfaces/refresh-token.repo';
import type { IEmailVerificationChallengeRepository } from '../repositories/interfaces/email-verification-challenge.repo';
import type { EmailSender } from '../lib/email/sender';
import { AppError } from '../lib/errors';
import { hashPassword, verifyPassword } from '../lib/password';
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt';
import { generateOtpCode, hashOtp, verifyOtp, OTP_TTL_MS, OTP_MAX_ATTEMPTS } from '../lib/otp';
import type { AuthSession, PublicUser, RegisterPendingVerification, User } from '../types';
import { toPublicUser } from '../types';

const RESEND_COOLDOWN_MS = 60 * 1000;
const RESEND_MAX_PER_HOUR = 5;
const RESEND_WINDOW_MS = 60 * 60 * 1000;

export class AuthService {
  constructor(
    private userRepo: IUserRepository,
    private refreshTokenRepo: IRefreshTokenRepository,
    private challengeRepo: IEmailVerificationChallengeRepository,
    private emailSender: EmailSender,
    private jwtSecret: string,
    /** In-memory timestamps of resend attempts per email (per isolate). */
    private resendThrottle: Map<string, number[]> = new Map(),
  ) {}

  async register(input: { name: string; email: string; password: string }): Promise<RegisterPendingVerification> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw AppError.emailAlreadyRegistered('Email already registered');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepo.create({
      id: uuidv4(),
      email,
      name: input.name.trim(),
      role: 'user',
      passwordHash,
      firebaseUid: null,
      emailVerifiedAt: null,
    });

    await this.issueChallengeAndSend(user);

    return { requiresEmailVerification: true, email };
  }

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(email);

    if (!user || !user.passwordHash) {
      throw AppError.unauthorized('Invalid credentials');
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw AppError.unauthorized('Invalid credentials');
    }

    if (!user.emailVerifiedAt) {
      throw AppError.emailNotVerified('Email not verified');
    }

    return this.issueSession(user);
  }

  async verifyEmail(email: string, code: string): Promise<AuthSession> {
    const normalized = email.trim().toLowerCase();
    const user = await this.userRepo.findByEmail(normalized);
    if (!user) {
      throw AppError.invalidOtp('Invalid or expired code');
    }

    if (user.emailVerifiedAt) {
      return this.issueSession(user);
    }

    const ch = await this.challengeRepo.findActiveByUserId(user.id);
    if (!ch) {
      throw AppError.otpExpired('Code expired');
    }
    if (new Date(ch.expiresAt).getTime() < Date.now()) {
      throw AppError.otpExpired('Code expired');
    }
    if (ch.attemptCount >= OTP_MAX_ATTEMPTS) {
      throw AppError.otpMaxAttempts('Too many attempts');
    }

    const ok = await verifyOtp(code, ch.codeHash);
    if (!ok) {
      await this.challengeRepo.incrementAttempts(ch.id);
      throw AppError.invalidOtp('Invalid or expired code');
    }

    await this.challengeRepo.consume(ch.id);
    const verified = await this.userRepo.update(user.id, {
      emailVerifiedAt: new Date().toISOString(),
    });
    return this.issueSession(verified);
  }

  async resendVerification(email: string): Promise<{ ok: true }> {
    const normalized = email.trim().toLowerCase();
    this.assertResendAllowed(normalized);

    const user = await this.userRepo.findByEmail(normalized);
    if (!user || user.emailVerifiedAt) {
      return { ok: true };
    }

    await this.issueChallengeAndSend(user);
    return { ok: true };
  }

  async loginWithGoogle(decoded: {
    firebaseUid: string;
    email: string;
    name?: string;
    emailVerified: boolean;
  }): Promise<AuthSession> {
    if (!decoded.email?.trim()) {
      throw AppError.unauthorized('Google token missing email');
    }
    if (!decoded.emailVerified) {
      throw AppError.unauthorized('Google email not verified');
    }

    const email = decoded.email.trim().toLowerCase();

    let user = await this.userRepo.findByFirebaseUid(decoded.firebaseUid);
    if (user) {
      if (!user.emailVerifiedAt) {
        user = await this.userRepo.update(user.id, {
          emailVerifiedAt: new Date().toISOString(),
        });
      }
      return this.issueSession(user);
    }

    const byEmail = await this.userRepo.findByEmail(email);
    if (byEmail) {
      if (byEmail.firebaseUid && byEmail.firebaseUid !== decoded.firebaseUid) {
        throw AppError.identityConflict('Account exists with different Google identity');
      }
      // No silent link: password account (or any email match without this firebase uid)
      throw AppError.emailRegisteredUsePassword('Email already registered; use password login');
    }

    user = await this.userRepo.create({
      id: uuidv4(),
      email,
      name: decoded.name?.trim() || email.split('@')[0] || 'User',
      role: 'user',
      firebaseUid: decoded.firebaseUid,
      passwordHash: null,
      emailVerifiedAt: new Date().toISOString(),
    });

    return this.issueSession(user);
  }

  async refresh(refreshToken: string): Promise<AuthSession> {
    const payload = await verifyRefreshToken(refreshToken, this.jwtSecret);
    const record = await this.refreshTokenRepo.findByJti(payload.jti);

    if (!record || record.revokedAt) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    if (new Date(record.expiresAt).getTime() < Date.now()) {
      throw AppError.unauthorized('Refresh token expired');
    }

    const tokenHash = await hashToken(refreshToken);
    if (tokenHash !== record.tokenHash) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    if (record.userId !== payload.sub) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    const user = await this.userRepo.findById(payload.sub);
    if (!user) {
      throw AppError.unauthorized('User not found');
    }

    await this.refreshTokenRepo.revokeByJti(payload.jti);
    return this.issueSession(user);
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const payload = await verifyRefreshToken(refreshToken, this.jwtSecret);
      await this.refreshTokenRepo.revokeByJti(payload.jti);
    } catch {
      // idempotent
    }
  }

  async getProfile(userId: string): Promise<PublicUser> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }
    return toPublicUser(user);
  }

  private assertResendAllowed(email: string): void {
    const now = Date.now();
    const recent = (this.resendThrottle.get(email) ?? []).filter((t) => now - t < RESEND_WINDOW_MS);

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
    this.resendThrottle.set(email, recent);
  }

  private async issueChallengeAndSend(user: User): Promise<void> {
    await this.challengeRepo.consumeAllActiveForUser(user.id);
    const code = generateOtpCode();
    const codeHash = await hashOtp(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();
    await this.challengeRepo.create({
      id: uuidv4(),
      userId: user.id,
      codeHash,
      expiresAt,
    });
    await this.emailSender.sendEmailVerificationOtp({
      to: user.email,
      code,
      expiresInMinutes: 10,
    });
  }

  private async issueSession(user: User): Promise<AuthSession> {
    const jti = uuidv4();
    const accessToken = await signAccessToken({ sub: user.id, role: user.role, email: user.email }, this.jwtSecret);
    const refreshToken = await signRefreshToken({ sub: user.id, jti }, this.jwtSecret);
    const tokenHash = await hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_SECONDS * 1000).toISOString();

    await this.refreshTokenRepo.create({
      id: uuidv4(),
      userId: user.id,
      jti,
      tokenHash,
      expiresAt,
    });

    return {
      user: toPublicUser(user),
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL_SECONDS,
    };
  }
}
