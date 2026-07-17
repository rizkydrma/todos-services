import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import { hashPassword } from '../../src/lib/password';
import { adminUser, createMockRefreshTokenRepo, createMockUserRepo, regularUser } from '../setup';

const JWT_SECRET = 'test-jwt-secret-at-least-32-chars!!';

describe('AuthService', () => {
  const mockUserRepo = createMockUserRepo();
  const mockRefreshRepo = createMockRefreshTokenRepo();
  const service = new AuthService(mockUserRepo, mockRefreshRepo, JWT_SECRET);

  beforeEach(() => {
    vi.clearAllMocks();
    mockRefreshRepo.create.mockImplementation(async (data) => ({
      ...data,
      revokedAt: null,
      createdAt: new Date().toISOString(),
    }));
  });

  describe('register', () => {
    it('registers a new user and returns session tokens', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockImplementation(async (data) => ({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        firebaseUid: data.firebaseUid ?? null,
        passwordHash: data.passwordHash ?? null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }));

      const result = await service.register({
        name: 'Budi',
        email: 'budi@yahoo.com',
        password: 'secret12',
      });

      expect(result.user.email).toBe('budi@yahoo.com');
      expect(result.user).not.toHaveProperty('passwordHash');
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
      expect(result.expiresIn).toBe(900);
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'budi@yahoo.com',
          name: 'Budi',
          role: 'user',
          firebaseUid: null,
          passwordHash: expect.stringMatching(/^pbkdf2\$/),
        }),
      );
      expect(mockRefreshRepo.create).toHaveBeenCalled();
    });

    it('throws CONFLICT when email already exists', async () => {
      mockUserRepo.findByEmail.mockResolvedValue(regularUser);

      await expect(
        service.register({
          name: 'X',
          email: regularUser.email,
          password: 'secret12',
        }),
      ).rejects.toThrow('Email already registered');

      expect(mockUserRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('returns session on valid credentials', async () => {
      const passwordHash = await hashPassword('secret12');
      const user = { ...adminUser, passwordHash };
      mockUserRepo.findByEmail.mockResolvedValue(user);

      const result = await service.login({
        email: adminUser.email,
        password: 'secret12',
      });

      expect(result.user.id).toBe(adminUser.id);
      expect(result.accessToken).toBeTruthy();
      expect(result.refreshToken).toBeTruthy();
    });

    it('throws UNAUTHORIZED for wrong password', async () => {
      const passwordHash = await hashPassword('secret12');
      mockUserRepo.findByEmail.mockResolvedValue({ ...adminUser, passwordHash });

      await expect(
        service.login({
          email: adminUser.email,
          password: 'wrong-password',
        }),
      ).rejects.toThrow('Invalid credentials');
    });

    it('throws UNAUTHORIZED when user has no password (Google-only)', async () => {
      mockUserRepo.findByEmail.mockResolvedValue({ ...regularUser, passwordHash: null });

      await expect(
        service.login({
          email: regularUser.email,
          password: 'anything',
        }),
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('loginWithGoogle', () => {
    it('auto-registers new Google user', async () => {
      mockUserRepo.findByFirebaseUid.mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(null);
      mockUserRepo.create.mockImplementation(async (data) => ({
        id: data.id,
        email: data.email,
        name: data.name,
        role: data.role,
        firebaseUid: data.firebaseUid ?? null,
        passwordHash: null,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
      }));

      const result = await service.loginWithGoogle({
        firebaseUid: 'google-uid-1',
        email: 'new@gmail.com',
        name: 'New User',
      });

      expect(result.user.email).toBe('new@gmail.com');
      expect(result.accessToken).toBeTruthy();
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firebaseUid: 'google-uid-1',
          passwordHash: null,
        }),
      );
    });

    it('links Google to existing email user without firebaseUid', async () => {
      const emailUser = { ...regularUser, firebaseUid: null, passwordHash: 'pbkdf2$x' };
      mockUserRepo.findByFirebaseUid.mockResolvedValue(null);
      mockUserRepo.findByEmail.mockResolvedValue(emailUser);
      mockUserRepo.update.mockResolvedValue({
        ...emailUser,
        firebaseUid: 'google-uid-2',
      });

      const result = await service.loginWithGoogle({
        firebaseUid: 'google-uid-2',
        email: emailUser.email,
        name: emailUser.name,
      });

      expect(result.user.id).toBe(emailUser.id);
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        emailUser.id,
        expect.objectContaining({ firebaseUid: 'google-uid-2' }),
      );
    });
  });

  describe('getProfile', () => {
    it('returns public user without passwordHash', async () => {
      mockUserRepo.findById.mockResolvedValue(adminUser);

      const result = await service.getProfile(adminUser.id);
      expect(result.email).toBe(adminUser.email);
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('throws NOT_FOUND when missing', async () => {
      mockUserRepo.findById.mockResolvedValue(null);
      await expect(service.getProfile('missing')).rejects.toThrow('User not found');
    });
  });
});
