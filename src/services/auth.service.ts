import { v4 as uuidv4 } from 'uuid';
import type { IUserRepository } from '../repositories/interfaces/user.repo';
import { AppError } from '../lib/errors';
import type { User } from '../types';

export class AuthService {
  constructor(private userRepo: IUserRepository) {}

  async register(tokenPayload: {
    firebaseUid: string;
    email: string;
    name: string;
  }): Promise<User> {
    const existing = await this.userRepo.findByFirebaseUid(tokenPayload.firebaseUid);
    if (existing) {
      throw AppError.conflict('User already registered');
    }

    return this.userRepo.create({
      id: uuidv4(),
      firebaseUid: tokenPayload.firebaseUid,
      email: tokenPayload.email,
      name: tokenPayload.name || tokenPayload.email.split('@')[0],
      role: 'user',
    });
  }

  async login(firebaseUid: string): Promise<User> {
    const user = await this.userRepo.findByFirebaseUid(firebaseUid);
    if (!user) {
      throw AppError.unauthorized('User not registered. Please register first.');
    }
    return user;
  }

  async getProfile(userId: string, tokenPayload: {
    email: string;
    name: string;
  }): Promise<User> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    const updates: { email?: string; name?: string } = {};
    if (tokenPayload.email !== user.email) {
      updates.email = tokenPayload.email;
    }
    if (tokenPayload.name && tokenPayload.name !== user.name) {
      updates.name = tokenPayload.name;
    }

    if (Object.keys(updates).length > 0) {
      return this.userRepo.update(userId, updates);
    }

    return user;
  }
}
