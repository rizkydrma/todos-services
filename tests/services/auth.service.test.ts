import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import { AppError } from '../../src/lib/errors';
import { hashPassword } from '../../src/lib/password';
import { hashOtp } from '../../src/lib/otp';
import {
  adminUser,
  createMockChallengeRepo,
  createMockRefreshTokenRepo,
  createMockUserRepo,
  regularUser,
} from '../setup';
import type { EmailSender } from '../../src/lib/email/sender';
import type { EmailVerificationChallenge } from '../../src/repositories/interfaces/email-verification-challenge.repo';
import type { User } from '../../src/types';

const JWT_SECRET = 'test-jwt-secret-at-least-32-chars!!';
const VERIFIED_AT = '2026-01-01T12:00:00.000Z';

function createMockEmailSender(): EmailSender {
  return {
    sendEmailVerificationOtp: vi.fn().mockResolvedValue(undefined),
  };
}

function buildUser(overrides: Partial<User> & Pick<User, 'id' | 'email'>): User {
  return {
    firebaseUid: null,
    name: 'Test',
    role: 'user',
    passwordHash: null,
    emailVerifiedAt: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function activeChallenge(
  overrides: Partial<EmailVerificationChallenge> & Pick<EmailVerificationChallenge, 'userId' | 'codeHash'>,
): EmailVerificationChallenge {
  return {
    id: 'challenge-1',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    attemptCount: 0,
    createdAt: new Date().toISOString(),
    consumedAt: null,
    ...overrides,
  };
}

describe('AuthService', () => {
  const mockUserRepo = createMockUserRepo();
  const mockRefreshRepo = createMockRefreshTokenRepo();
  const mockChallengeRepo = createMockChallengeRepo();
  const mockEmailSender = createMockEmailSender();
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(mockUserRepo, mockRefreshRepo, mockChallengeRepo, mockEmailSender, JWT_SECRET, new Map());
    mockRefreshRepo.create.mockImplementation(async (data) => ({
      ...data,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    }));
    mockChallengeRepo.create.mockImplementation(async (data) => ({
      ...data,
      attemptCount: 0,
      createdAt: new Date().toISOString(),
      consumedAt: null,
    }));
    mockChallengeRepo.consumeAllActiveForUser.mockResolvedValue(undefined);
    mockChallengeRepo.consume.mockResolvedValue(undefined);
    mockChallengeRepo.incrementAttempts.mockImplementation(async (id) =>
      activeChallenge({ id, userId: 'u', codeHash: 'x', attemptCount: 1 }),
    );
  });

  describe('register', () => {
    it('returns pending verification without tokens and issues challenge + email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockImplementation(async (data) =>
        buildUser({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          firebaseUid: data.firebaseUid ?? null,
          passwordHash: data.passwordHash ?? null,
          emailVerifiedAt: data.emailVerifiedAt ?? null,
        }),
      );

      const result = await service.register({
        name: 'Budi',
        email: 'budi@yahoo.com',
        password: 'secret12',
      });

      expect(result).toEqual({
        requiresEmailVerification: true,
        email: 'budi@yahoo.com',
      });
      expect(result).not.toHaveProperty('accessToken');
      expect(result).not.toHaveProperty('refreshToken');
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'budi@yahoo.com',
          name: 'Budi',
          role: 'user',
          firebaseUid: null,
          emailVerifiedAt: null,
          passwordHash: expect.stringMatching(/^pbkdf2\$/),
        }),
      );
      expect(mockChallengeRepo.consumeAllActiveForUser).toHaveBeenCalled();
      expect(mockChallengeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(String),
          codeHash: expect.any(String),
          expiresAt: expect.any(String),
        }),
      );
      expect(mockEmailSender.sendEmailVerificationOtp).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'budi@yahoo.com',
          code: expect.stringMatching(/^\d{6}$/),
          expiresInMinutes: 10,
        }),
      );
      expect(mockRefreshRepo.create).not.toHaveBeenCalled();
    });

    it('throws EMAIL_ALREADY_REGISTERED when email already exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(regularUser);

      await expect(
        service.register({
          name: 'X',
          email: regularUser.email,
          password: 'secret12',
        }),
      ).rejects.toMatchObject({
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Email already registered',
      });

      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns session on valid credentials when email is verified', async () => {
      const passwordHash = await hashPassword('secret12');
      const user = { ...adminUser, passwordHash, emailVerifiedAt: VERIFIED_AT };
      mockUserRepo.findByEmail.mockResolvedValue(user);

      const result = await service.login({
        email: adminUser.email,
        password: 'secret12',
      });

      expect(result.user.id).toBe(adminUser.id);
      expect(result.user.emailVerified).toBe(true);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('throws EMAIL_NOT_VERIFIED when password is correct but email is not verified', async () => {
      const passwordHash = await hashPassword('secret12');
      mockUserRepo.findByEmail.mockResolvedValue({
        ...adminUser,
        passwordHash,
        emailVerifiedAt: null,
      });

      await expect(
        service.login({
          email: adminUser.email,
          password: 'secret12',
        }),
      ).rejects.toMatchObject({
        code: 'EMAIL_NOT_VERIFIED',
        status: 403,
      });
      expect(mockRefreshRepo.create).not.toHaveBeenCalled();
    });

    it('throws UNAUTHORIZED for wrong password (not EMAIL_NOT_VERIFIED)', async () => {
      const passwordHash = await hashPassword('secret12');
      mockUserRepo.findByEmail.mockResolvedValue({
        ...adminUser,
        passwordHash,
        emailVerifiedAt: null,
      });

      try {
        await service.login({
          email: adminUser.email,
          password: 'wrong-password',
        });
        expect.fail('should throw');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('UNAUTHORIZED');
        expect((err as AppError).message).toBe('Invalid credentials');
      }
    });

    it('throws UNAUTHORIZED when user has no password (Google-only)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({
        ...regularUser,
        passwordHash: null,
        emailVerifiedAt: VERIFIED_AT,
      });

      await expect(
        service.login({
          email: regularUser.email,
          password: 'anything',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('verifyEmail', () => {
    it('on success consumes challenge, sets emailVerifiedAt, and issues session', async () => {
      const code = '123456';
      const codeHash = await hashOtp(code);
      const user = buildUser({
        id: 'user-1',
        email: 'verify@test.com',
        passwordHash: 'pbkdf2$x',
        emailVerifiedAt: null,
      });
      const verified = { ...user, emailVerifiedAt: VERIFIED_AT };

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockChallengeRepo.findActiveByUserId.mockResolvedValue(activeChallenge({ userId: user.id, codeHash }));
      mockUserRepo.update.mockResolvedValue(verified);

      const result = await service.verifyEmail(user.email, code);

      expect(mockChallengeRepo.consume).toHaveBeenCalledWith('challenge-1');
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        user.id,
        expect.objectContaining({ emailVerifiedAt: expect.any(String) }),
      );
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.user.emailVerified).toBe(true);
    });

    it('throws INVALID_OTP and increments attempts on wrong code', async () => {
      const codeHash = await hashOtp('123456');
      const user = buildUser({ id: 'user-1', email: 'verify@test.com' });

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockChallengeRepo.findActiveByUserId.mockResolvedValue(activeChallenge({ userId: user.id, codeHash }));

      await expect(service.verifyEmail(user.email, '000000')).rejects.toMatchObject({
        code: 'INVALID_OTP',
        status: 401,
      });
      expect(mockChallengeRepo.incrementAttempts).toHaveBeenCalledWith('challenge-1');
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('throws OTP_EXPIRED when challenge is expired', async () => {
      const codeHash = await hashOtp('123456');
      const user = buildUser({ id: 'user-1', email: 'verify@test.com' });

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockChallengeRepo.findActiveByUserId.mockResolvedValue(
        activeChallenge({
          userId: user.id,
          codeHash,
          expiresAt: new Date(Date.now() - 1000).toISOString(),
        }),
      );

      await expect(service.verifyEmail(user.email, '123456')).rejects.toMatchObject({
        code: 'OTP_EXPIRED',
        status: 401,
      });
      expect(mockChallengeRepo.incrementAttempts).not.toHaveBeenCalled();
    });

    it('throws OTP_EXPIRED when no active challenge', async () => {
      const user = buildUser({ id: 'user-1', email: 'verify@test.com' });
      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockChallengeRepo.findActiveByUserId.mockResolvedValue(null);

      await expect(service.verifyEmail(user.email, '123456')).rejects.toMatchObject({
        code: 'OTP_EXPIRED',
      });
    });

    it('throws OTP_MAX_ATTEMPTS when attempt limit reached', async () => {
      const codeHash = await hashOtp('123456');
      const user = buildUser({ id: 'user-1', email: 'verify@test.com' });

      mockUserRepo.findByEmail.mockResolvedValue(user);
      mockChallengeRepo.findActiveByUserId.mockResolvedValue(
        activeChallenge({ userId: user.id, codeHash, attemptCount: 5 }),
      );

      await expect(service.verifyEmail(user.email, '123456')).rejects.toMatchObject({
        code: 'OTP_MAX_ATTEMPTS',
        status: 429,
      });
    });

    it('issues session when already verified without consuming challenge', async () => {
      const user = buildUser({
        id: 'user-1',
        email: 'verify@test.com',
        emailVerifiedAt: VERIFIED_AT,
      });
      mockUserRepo.findByEmail.mockResolvedValue(user);

      const result = await service.verifyEmail(user.email, '123456');

      expect(result.accessToken).toBeTruthy();
      expect(mockChallengeRepo.findActiveByUserId).not.toHaveBeenCalled();
      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('throws INVALID_OTP for unknown email', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      await expect(service.verifyEmail('missing@test.com', '123456')).rejects.toMatchObject({
        code: 'INVALID_OTP',
      });
    });
  });

  describe('resendVerification', () => {
    it('creates a new challenge and sends email for unverified user', async () => {
      const user = buildUser({
        id: 'user-1',
        email: 'resend@test.com',
        emailVerifiedAt: null,
      });
      mockUserRepo.findByEmail.mockResolvedValue(user);

      const result = await service.resendVerification(user.email);

      expect(result).toEqual({ ok: true });
      expect(mockChallengeRepo.consumeAllActiveForUser).toHaveBeenCalledWith(user.id);
      expect(mockChallengeRepo.create).toHaveBeenCalled();
      expect(mockEmailSender.sendEmailVerificationOtp).toHaveBeenCalledWith(
        expect.objectContaining({ to: user.email }),
      );
    });

    it('returns ok silently when user is missing', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);

      const result = await service.resendVerification('ghost@test.com');

      expect(result).toEqual({ ok: true });
      expect(mockChallengeRepo.create).not.toHaveBeenCalled();
      expect(mockEmailSender.sendEmailVerificationOtp).not.toHaveBeenCalled();
    });

    it('returns ok silently when already verified', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(
        buildUser({
          id: 'user-1',
          email: 'done@test.com',
          emailVerifiedAt: VERIFIED_AT,
        }),
      );

      const result = await service.resendVerification('done@test.com');

      expect(result).toEqual({ ok: true });
      expect(mockChallengeRepo.create).not.toHaveBeenCalled();
    });

    it('throws RATE_LIMITED when resending within 60s cooldown', async () => {
      const user = buildUser({ id: 'user-1', email: 'throttle@test.com' });
      mockUserRepo.findByEmail.mockResolvedValue(user);

      await service.resendVerification(user.email);
      await expect(service.resendVerification(user.email)).rejects.toMatchObject({
        code: 'RATE_LIMITED',
        status: 429,
      });
    });

    it('throws RATE_LIMITED after 5 resends in one hour', async () => {
      const throttle = new Map<string, number[]>();
      const email = 'hour@test.com';
      const now = Date.now();
      // 4 prior attempts outside 60s cooldown window but within the hour
      throttle.set(email, [now - 50 * 60_000, now - 40 * 60_000, now - 30 * 60_000, now - 20 * 60_000, now - 70_000]);

      const limitedService = new AuthService(
        mockUserRepo,
        mockRefreshRepo,
        mockChallengeRepo,
        mockEmailSender,
        JWT_SECRET,
        throttle,
      );
      mockUserRepo.findByEmail.mockResolvedValue(buildUser({ id: 'user-1', email }));

      await expect(limitedService.resendVerification(email)).rejects.toMatchObject({
        code: 'RATE_LIMITED',
      });
    });
  });

  describe('loginWithGoogle', () => {
    it('creates a verified Google user when email is free', async () => {
      mockUserRepo.findByFirebaseUid.mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockImplementation(async (data) =>
        buildUser({
          id: data.id,
          email: data.email,
          name: data.name,
          role: data.role,
          firebaseUid: data.firebaseUid ?? null,
          passwordHash: null,
          emailVerifiedAt: data.emailVerifiedAt ?? null,
        }),
      );

      const result = await service.loginWithGoogle({
        firebaseUid: 'google-uid-1',
        email: 'new@gmail.com',
        name: 'New User',
        emailVerified: true,
      });

      expect(result.user.email).toBe('new@gmail.com');
      expect(result.user.emailVerified).toBe(true);
      expect(result.accessToken).toBeTruthy();
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firebaseUid: 'google-uid-1',
          passwordHash: null,
          emailVerifiedAt: expect.any(String),
        }),
      );
    });

    it('rejects when Google emailVerified claim is false', async () => {
      await expect(
        service.loginWithGoogle({
          firebaseUid: 'google-uid-1',
          email: 'new@gmail.com',
          emailVerified: false,
        }),
      ).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
        message: 'Google email not verified',
      });
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('throws EMAIL_REGISTERED_USE_PASSWORD for existing password user (no silent link)', async () => {
      const emailUser = {
        ...regularUser,
        firebaseUid: null,
        passwordHash: 'pbkdf2$x',
        emailVerifiedAt: null,
      };
      mockUserRepo.findByFirebaseUid.mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(emailUser);

      await expect(
        service.loginWithGoogle({
          firebaseUid: 'google-uid-2',
          email: emailUser.email,
          name: emailUser.name,
          emailVerified: true,
        }),
      ).rejects.toMatchObject({
        code: 'EMAIL_REGISTERED_USE_PASSWORD',
        status: 409,
      });

      expect(mockUserRepo.update).not.toHaveBeenCalled();
      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });

    it('throws IDENTITY_CONFLICT when email is tied to a different firebase uid', async () => {
      const emailUser = buildUser({
        id: 'other-user',
        email: 'taken@gmail.com',
        firebaseUid: 'other-google-uid',
        emailVerifiedAt: VERIFIED_AT,
      });
      mockUserRepo.findByFirebaseUid.mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(emailUser);

      await expect(
        service.loginWithGoogle({
          firebaseUid: 'google-uid-3',
          email: emailUser.email,
          emailVerified: true,
        }),
      ).rejects.toMatchObject({
        code: 'IDENTITY_CONFLICT',
        status: 409,
      });
    });

    it('returns session by firebase_uid and backfills emailVerifiedAt if null', async () => {
      const googleUser = buildUser({
        id: 'g-user',
        email: 'g@gmail.com',
        firebaseUid: 'google-uid-existing',
        emailVerifiedAt: null,
      });
      const backfilled = { ...googleUser, emailVerifiedAt: VERIFIED_AT };
      mockUserRepo.findByFirebaseUid.mockResolvedValue(googleUser);
      mockUserRepo.update.mockResolvedValue(backfilled);

      const result = await service.loginWithGoogle({
        firebaseUid: 'google-uid-existing',
        email: googleUser.email,
        emailVerified: true,
      });

      expect(mockUserRepo.update).toHaveBeenCalledWith(
        googleUser.id,
        expect.objectContaining({ emailVerifiedAt: expect.any(String) }),
      );
      expect(result.user.emailVerified).toBe(true);
      expect(result.accessToken).toBeTruthy();
      expect(mockUserRepo.findByEmail).not.toHaveBeenCalled();
    });

    it('returns session by firebase_uid without update when already verified', async () => {
      const googleUser = buildUser({
        id: 'g-user',
        email: 'g@gmail.com',
        firebaseUid: 'google-uid-existing',
        emailVerifiedAt: VERIFIED_AT,
      });
      mockUserRepo.findByFirebaseUid.mockResolvedValue(googleUser);

      const result = await service.loginWithGoogle({
        firebaseUid: 'google-uid-existing',
        email: googleUser.email,
        emailVerified: true,
      });

      expect(mockUserRepo.update).not.toHaveBeenCalled();
      expect(result.accessToken).toBeTruthy();
    });
  });

  describe('getProfile', () => {
    it('returns public user without passwordHash', async () => {
      mockUserRepo.findById.mockResolvedValue({ ...adminUser, emailVerifiedAt: VERIFIED_AT });

      const result = await service.getProfile(adminUser.id);
      expect(result.email).toBe(adminUser.email);
      expect(result.emailVerified).toBe(true);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NOT_FOUND when missing', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toThrow('User not found');
    });
  });
});
