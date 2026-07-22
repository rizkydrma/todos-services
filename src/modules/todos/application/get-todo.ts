import { AppError } from '../../../platform/errors/app-error';
import type { TodoWithRelations } from '../../../types';
import type { ITodoRepository } from './ports';

export type GetTodoInput = {
  id: string;
  userId: string;
};

export function getTodo(deps: { todoRepo: ITodoRepository }) {
  return async (input: GetTodoInput): Promise<TodoWithRelations> => {
    const todo = await deps.todoRepo.findById(input.id);
    if (!todo) throw AppError.notFound('Todo');
    if (todo.userId !== input.userId) {
      throw AppError.forbidden('You do not have access to this todo');
    }
    return todo;
  };
}
