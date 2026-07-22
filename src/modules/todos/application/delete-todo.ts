import { getTodo } from './get-todo';
import type { ITodoRepository } from './ports';

export type DeleteTodoInput = {
  id: string;
  userId: string;
};

export function deleteTodo(deps: { todoRepo: ITodoRepository }) {
  const ensureOwned = getTodo({ todoRepo: deps.todoRepo });

  return async (input: DeleteTodoInput): Promise<void> => {
    await ensureOwned(input);
    await deps.todoRepo.delete(input.id);
  };
}
