import { AppError } from '../../../platform/errors/app-error';
import type { Tag } from '../../../types';
import type { ITagRepository, UpdateTagInput } from './ports';

export type UpdateTagCommand = {
  id: string;
  data: UpdateTagInput;
};

export function updateTag(deps: { tagRepo: ITagRepository }) {
  return async (input: UpdateTagCommand): Promise<Tag> => {
    const tag = await deps.tagRepo.findById(input.id);
    if (!tag) throw AppError.notFound('Tag');

    if (input.data.name && input.data.name !== tag.name) {
      const existing = await deps.tagRepo.findByName(input.data.name);
      if (existing) throw AppError.conflict(`Tag "${input.data.name}" already exists`);
    }

    return deps.tagRepo.update(input.id, input.data);
  };
}
