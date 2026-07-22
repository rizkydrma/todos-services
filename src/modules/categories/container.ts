import { createCategory } from './application/create-category';
import { deleteCategory } from './application/delete-category';
import { listCategories } from './application/list-categories';
import { updateCategory } from './application/update-category';
import type { ICategoryRepository, IdGenerator } from './application/ports';

export type CategoriesUseCases = {
  list: ReturnType<typeof listCategories>;
  create: ReturnType<typeof createCategory>;
  update: ReturnType<typeof updateCategory>;
  delete: ReturnType<typeof deleteCategory>;
};

export function buildCategoriesUseCases(deps: {
  categoryRepo: ICategoryRepository;
  ids: IdGenerator;
}): CategoriesUseCases {
  return {
    list: listCategories({ categoryRepo: deps.categoryRepo }),
    create: createCategory({ categoryRepo: deps.categoryRepo, ids: deps.ids }),
    update: updateCategory({ categoryRepo: deps.categoryRepo }),
    delete: deleteCategory({ categoryRepo: deps.categoryRepo }),
  };
}
