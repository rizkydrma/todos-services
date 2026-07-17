import { v4 as uuidv4 } from 'uuid';
import type { IUserRepository } from '../repositories/interfaces/user.repo';
import type { IRefreshTokenRepository } from '../repositories/interfaces/refresh-token.repo';
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
import type { AuthSession, PublicUser, User } from '../types';
import { toPublicUser } from '../types';

export class AuthService {
  constructor(
    private userRepo: IUserRepository,
    private refreshTokenRepo: IRefreshTokenRepository,
    private jwtSecret: string,
  ) {}

  async register(input: { name: string; email: string; password: string }): Promise<AuthSession> {
    const email = input.email.trim().toLowerCase();
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw AppError.conflict('Email already registered');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.userRepo.create({
      id: uuidv4(),
      email,
      name: input.name.trim(),
      role: 'user',
      passwordHash,
      firebaseUid: null,
    });

    return this.issueSession(user);
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

    return this.issueSession(user);
  }

  async loginWithGoogle(decoded: { firebaseUid: string; email: string; name?: string }): Promise<AuthSession> {
    const email = decoded.email.trim().toLowerCase();
    if (!email) {
      throw AppError.unauthorized('Google token missing email');
    }

    let user = await this.userRepo.findByFirebaseUid(decoded.firebaseUid);

    if (!user) {
      const byEmail = await this.userRepo.findByEmail(email);
      if (byEmail) {
        if (byEmail.firebaseUid && byEmail.firebaseUid !== decoded.firebaseUid) {
          throw AppError.conflict('Account exists with different Google identity');
        }
        user = await this.userRepo.update(byEmail.id, {
          firebaseUid: decoded.firebaseUid,
          name: decoded.name || byEmail.name,
          email,
        });
      } else {
        user = await this.userRepo.create({
          id: uuidv4(),
          email,
          name: decoded.name?.trim() || email.split('@')[0] || 'User',
          role: 'user',
          firebaseUid: decoded.firebaseUid,
          passwordHash: null,
        });
      }
    }

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
