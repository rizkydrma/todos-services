import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from '../../src/services/auth.service';
import { createMockUserRepo } from '../setup';
import { adminUser, regularUser } from '../setup';

describe('AuthService', () => {
  const mockRepo = createMockUserRepo();
  const service = new AuthService(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('registers a new user successfully', async () => {
      mockRepo.findByFirebaseUid.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(regularUser);

      const result = await service.register({
        firebaseUid: regularUser.firebaseUid,
        email: regularUser.email,
        name: regularUser.name,
      });

      expect(result).toEqual(regularUser);
      expect(mockRepo.findByFirebaseUid).toHaveBeenCalledWith(regularUser.firebaseUid);
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          firebaseUid: regularUser.firebaseUid,
          email: regularUser.email,
          role: 'user',
        }),
      );
    });

    it('throws CONFLICT when user already exists', async () => {
      mockRepo.findByFirebaseUid.mockResolvedValue(regularUser);

      await expect(
        service.register({
          firebaseUid: regularUser.firebaseUid,
          email: regularUser.email,
          name: regularUser.name,
        }),
      ).rejects.toThrow('User already registered');

      expect(mockRepo.create).not.toHaveBeenCalled();
    });

    it('uses email prefix as fallback name', async () => {
      mockRepo.findByFirebaseUid.mockResolvedValue(null);
      mockRepo.create.mockResolvedValue(regularUser);

      await service.register({
        firebaseUid: 'user-3',
        email: 'johndoe@test.com',
        name: '',
      });

      expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'johndoe' }));
    });
  });

  describe('login', () => {
    it('returns user on successful login', async () => {
      mockRepo.findByFirebaseUid.mockResolvedValue(adminUser);

      const result = await service.login(adminUser.firebaseUid);
      expect(result).toEqual(adminUser);
    });

    it('throws UNAUTHORIZED when user not registered', async () => {
      mockRepo.findByFirebaseUid.mockResolvedValue(null);

      await expect(service.login('unknown-uid')).rejects.toThrow('User not registered');
    });
  });

  describe('getProfile', () => {
    it('returns user without syncing when data matches', async () => {
      mockRepo.findById.mockResolvedValue(adminUser);

      const result = await service.getProfile(adminUser.id, {
        email: adminUser.email,
        name: adminUser.name,
      });

      expect(result).toEqual(adminUser);
      expect(mockRepo.update).not.toHaveBeenCalled();
    });

    it('syncs email when token has newer data', async () => {
      const updatedEmail = 'newemail@test.com';
      mockRepo.findById.mockResolvedValue(adminUser);
      mockRepo.update.mockResolvedValue({ ...adminUser, email: updatedEmail });

      const result = await service.getProfile(adminUser.id, {
        email: updatedEmail,
        name: adminUser.name,
      });

      expect(result.email).toBe(updatedEmail);
      expect(mockRepo.update).toHaveBeenCalledWith(adminUser.id, { email: updatedEmail });
    });

    it('throws NOT_FOUND when user does not exist', async () => {
      mockRepo.findById.mockResolvedValue(null);

      await expect(service.getProfile('unknown', { email: 'x@y.com', name: 'X' })).rejects.toThrow('User not found');
    });
  });
});
