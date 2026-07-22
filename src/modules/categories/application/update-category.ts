import { AppError } from '../../../platform/errors/app-error';
import type { Category } from '../../../types';
import type { ICategoryRepository, UpdateCategoryInput } from './ports';

export type UpdateCategoryCommand = {
  id: string;
  data: UpdateCategoryInput;
};

export function updateCategory(deps: { categoryRepo: ICategoryRepository }) {
  return async (input: UpdateCategoryCommand): Promise<Category> => {
    const category = await deps.categoryRepo.findById(input.id);
    if (!category) throw AppError.notFound('Category');

    if (input.data.name && input.data.name !== category.name) {
      const existing = await deps.categoryRepo.findByName(input.data.name);
      if (existing) throw AppError.conflict(`Category "${input.data.name}" already exists`);
    }

    return deps.categoryRepo.update(input.id, input.data);
  };
}
