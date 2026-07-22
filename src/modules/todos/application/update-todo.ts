import { AppError } from '../../../platform/errors/app-error';
import type { Todo } from '../../../types';
import { getTodo } from './get-todo';
import type { ICategoryReader, ITagReader, ITodoRepository, UpdateTodoInput } from './ports';

export type UpdateTodoCommand = {
  id: string;
  userId: string;
  data: UpdateTodoInput;
};

export function updateTodo(deps: {
  todoRepo: ITodoRepository;
  categoryReader: ICategoryReader;
  tagReader: ITagReader;
}) {
  const ensureOwned = getTodo({ todoRepo: deps.todoRepo });

  return async (input: UpdateTodoCommand): Promise<Todo> => {
    await ensureOwned({ id: input.id, userId: input.userId });

    if (input.data.categoryId) {
      const category = await deps.categoryReader.findById(input.data.categoryId);
      if (!category) throw AppError.validation('Category not found');
    }

    if (input.data.tagIds && input.data.tagIds.length > 0) {
      const foundTags = await deps.tagReader.findByIds(input.data.tagIds);
      if (foundTags.length !== input.data.tagIds.length) {
        throw AppError.validation('One or more tags not found');
      }
    }

    return deps.todoRepo.update(input.id, input.data);
  };
}
