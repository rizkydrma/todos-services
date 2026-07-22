import { AppError } from '../../../platform/errors/app-error';
import type { Todo } from '../../../types';
import type { CreateTodoInput, ICategoryReader, IdGenerator, ITagReader, ITodoRepository } from './ports';

export type CreateTodoCommand = {
  userId: string;
  data: Omit<CreateTodoInput, 'id' | 'userId'>;
};

export function createTodo(deps: {
  todoRepo: ITodoRepository;
  categoryReader: ICategoryReader;
  tagReader: ITagReader;
  ids: IdGenerator;
}) {
  return async (input: CreateTodoCommand): Promise<Todo> => {
    const { data, userId } = input;

    if (data.categoryId) {
      const category = await deps.categoryReader.findById(data.categoryId);
      if (!category) throw AppError.validation('Category not found');
    }

    if (data.tagIds && data.tagIds.length > 0) {
      const foundTags = await deps.tagReader.findByIds(data.tagIds);
      if (foundTags.length !== data.tagIds.length) {
        throw AppError.validation('One or more tags not found');
      }
    }

    return deps.todoRepo.create({
      id: deps.ids.next(),
      userId,
      ...data,
    });
  };
}
