import { AppError } from '../../../platform/errors/app-error';
import type { Tag } from '../../../types';
import type { CreateTagInput, IdGenerator, ITagRepository } from './ports';

export type CreateTagCommand = Omit<CreateTagInput, 'id'>;

export function createTag(deps: { tagRepo: ITagRepository; ids: IdGenerator }) {
  return async (data: CreateTagCommand): Promise<Tag> => {
    const existing = await deps.tagRepo.findByName(data.name);
    if (existing) throw AppError.conflict(`Tag "${data.name}" already exists`);
    return deps.tagRepo.create({ id: deps.ids.next(), ...data });
  };
}
