import type { PaginatedResult, PaginationParams, TodoWithRelations } from '../../../types';
import type { FindTodosInput, ITodoRepository } from './ports';

export type ListTodosInput = FindTodosInput & PaginationParams;

export function listTodos(deps: { todoRepo: ITodoRepository }) {
  return async (input: ListTodosInput): Promise<PaginatedResult<TodoWithRelations>> => {
    return deps.todoRepo.findByUserId(input);
  };
}
