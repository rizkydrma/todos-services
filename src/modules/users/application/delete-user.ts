import { AppError } from '../../../platform/errors/app-error';
import type { IUserRepository } from './ports';

export function deleteUser(deps: { userRepo: IUserRepository }) {
  return async (id: string): Promise<void> => {
    const user = await deps.userRepo.findById(id);
    if (!user) throw AppError.notFound('User');
    await deps.userRepo.delete(id);
  };
}
