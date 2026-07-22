import { AppError } from '../../../platform/errors/app-error';
import type { PublicUser } from '../../../types';
import type { AuthDeps } from './deps';
import type { UpdateUserInput } from './ports';
import { toPublic } from './to-public';

export type UpdateProfileInput = { name?: string; avatarKey?: string | null };

export function updateProfile(deps: AuthDeps) {
  return async (userId: string, input: UpdateProfileInput): Promise<PublicUser> => {
    const user = await deps.userRepo.findById(userId);
    if (!user) {
      throw AppError.notFound('User');
    }

    const patch: UpdateUserInput = {};

    if (input.name !== undefined) {
      const name = input.name.trim();
      if (!name) {
        throw AppError.validation('Name is required');
      }
      patch.name = name;
    }

    if (input.avatarKey !== undefined) {
      if (input.avatarKey === null) {
        patch.avatarKey = null;
      } else {
        const key = input.avatarKey.trim();
        if (!key) {
          throw AppError.validation('avatarKey cannot be empty');
        }
        patch.avatarKey = key;
      }
    }

    if (Object.keys(patch).length === 0) {
      return toPublic(deps, user);
    }

    const previousKey = user.avatarKey;
    const updated = await deps.userRepo.update(userId, patch);

    if (input.avatarKey !== undefined && previousKey && previousKey !== patch.avatarKey) {
      await bestEffortDelete(deps, previousKey);
    }

    return toPublic(deps, updated);
  };
}

async function bestEffortDelete(deps: AuthDeps, key: string): Promise<void> {
  if (!deps.avatarStore?.deleteObject) return;
  try {
    await deps.avatarStore.deleteObject(key);
  } catch {
    // best-effort: DB is source of truth for avatar_key
  }
}
