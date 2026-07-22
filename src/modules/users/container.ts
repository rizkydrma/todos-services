import { deleteUser } from './application/delete-user';
import { getUser } from './application/get-user';
import { listUsers } from './application/list-users';
import { updateUserRole } from './application/update-user-role';
import type { IUserRepository } from './application/ports';

export type UsersUseCases = {
  list: ReturnType<typeof listUsers>;
  get: ReturnType<typeof getUser>;
  updateRole: ReturnType<typeof updateUserRole>;
  delete: ReturnType<typeof deleteUser>;
};

export function buildUsersUseCases(deps: { userRepo: IUserRepository; r2PublicUrl?: string }): UsersUseCases {
  return {
    list: listUsers(deps),
    get: getUser(deps),
    updateRole: updateUserRole(deps),
    delete: deleteUser({ userRepo: deps.userRepo }),
  };
}
