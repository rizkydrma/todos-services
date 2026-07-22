import type { Tag } from '../../../types';
import type { ITagRepository } from './ports';

export function listTags(deps: { tagRepo: ITagRepository }) {
  return async (): Promise<Tag[]> => deps.tagRepo.findMany();
}
