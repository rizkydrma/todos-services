import { AppError } from '../../../platform/errors/app-error';
import type { ITodoRepository } from './ports';

export type BatchTodosInput = {
  userId: string;
  action: 'complete-all' | 'delete-completed';
};

export function batchTodos(deps: { todoRepo: ITodoRepository }) {
  return async (input: BatchTodosInput): Promise<{ affected: number }> => {
    if (input.action === 'complete-all') {
      return { affected: await deps.todoRepo.completeAllByUserId(input.userId) };
    }
    if (input.action === 'delete-completed') {
      return { affected: await deps.todoRepo.deleteCompletedByUserId(input.userId) };
    }
    throw AppError.validation('Invalid batch action');
  };
}
