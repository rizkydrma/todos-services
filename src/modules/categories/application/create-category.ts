import { AppError } from '../../../platform/errors/app-error';
import type { Category } from '../../../types';
import type { CreateCategoryInput, ICategoryRepository, IdGenerator } from './ports';

export type CreateCategoryCommand = Omit<CreateCategoryInput, 'id'>;

export function createCategory(deps: { categoryRepo: ICategoryRepository; ids: IdGenerator }) {
  return async (data: CreateCategoryCommand): Promise<Category> => {
    const existing = await deps.categoryRepo.findByName(data.name);
    if (existing) throw AppError.conflict(`Category "${data.name}" already exists`);
    return deps.categoryRepo.create({ id: deps.ids.next(), ...data });
  };
}
