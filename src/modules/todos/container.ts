import { batchTodos } from './application/batch-todos';
import { createTodo } from './application/create-todo';
import { deleteTodo } from './application/delete-todo';
import { getTodo } from './application/get-todo';
import { listTodos } from './application/list-todos';
import { updateTodo } from './application/update-todo';
import type { ICategoryReader, IdGenerator, ITagReader, ITodoRepository } from './application/ports';

export type TodosUseCases = {
  list: ReturnType<typeof listTodos>;
  get: ReturnType<typeof getTodo>;
  create: ReturnType<typeof createTodo>;
  update: ReturnType<typeof updateTodo>;
  delete: ReturnType<typeof deleteTodo>;
  batch: ReturnType<typeof batchTodos>;
};

export function buildTodosUseCases(deps: {
  todoRepo: ITodoRepository;
  categoryReader: ICategoryReader;
  tagReader: ITagReader;
  ids: IdGenerator;
}): TodosUseCases {
  return {
    list: listTodos({ todoRepo: deps.todoRepo }),
    get: getTodo({ todoRepo: deps.todoRepo }),
    create: createTodo({
      todoRepo: deps.todoRepo,
      categoryReader: deps.categoryReader,
      tagReader: deps.tagReader,
      ids: deps.ids,
    }),
    update: updateTodo({
      todoRepo: deps.todoRepo,
      categoryReader: deps.categoryReader,
      tagReader: deps.tagReader,
    }),
    delete: deleteTodo({ todoRepo: deps.todoRepo }),
    batch: batchTodos({ todoRepo: deps.todoRepo }),
  };
}
