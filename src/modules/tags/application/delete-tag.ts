import { AppError } from '../../../platform/errors/app-error';
import type { ITagRepository } from './ports';

export type DeleteTagInput = { id: string };

export function deleteTag(deps: { tagRepo: ITagRepository }) {
  return async (input: DeleteTagInput): Promise<void> => {
    const tag = await deps.tagRepo.findById(input.id);
    if (!tag) throw AppError.notFound('Tag');
    await deps.tagRepo.delete(input.id);
  };
}
