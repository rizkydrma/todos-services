import type { Category } from '../../../types';
import type { ICategoryRepository } from './ports';

export function listCategories(deps: { categoryRepo: ICategoryRepository }) {
  return async (): Promise<Category[]> => deps.categoryRepo.findMany();
}
