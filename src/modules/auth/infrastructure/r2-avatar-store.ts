import { deleteObject, type R2Env } from '../../../lib/r2';
import type { AvatarObjectStore } from '../application/ports';

export function createAvatarStore(r2?: R2Env): AvatarObjectStore | undefined {
  if (!r2) return undefined;
  return {
    publicUrlBase: r2.R2_PUBLIC_URL,
    deleteObject: (key) => deleteObject(r2, key),
  };
}
