import { AppError } from '../../../platform/errors/app-error';
import type { ICategoryRepository } from './ports';

export type DeleteCategoryInput = { id: string };

export function deleteCategory(deps: { categoryRepo: ICategoryRepository }) {
  return async (input: DeleteCategoryInput): Promise<void> => {
    const category = await deps.categoryRepo.findById(input.id);
    if (!category) throw AppError.notFound('Category');
    await deps.categoryRepo.delete(input.id);
  };
}
