import { toPublicUser, type PublicUser, type User } from '../../../types';
import type { AuthDeps } from './deps';

export function toPublic(deps: AuthDeps, user: User): PublicUser {
  return toPublicUser(user, deps.avatarStore?.publicUrlBase);
}
