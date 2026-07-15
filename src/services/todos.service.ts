import { v4 as uuidv4 } from 'uuid';
import type {
  ITodoRepository,
  FindTodosInput,
  CreateTodoInput,
  UpdateTodoInput,
} from '../repositories/interfaces/todo.repo';
import type { ICategoryRepository } from '../repositories/interfaces/category.repo';
import type { ITagRepository } from '../repositories/interfaces/tag.repo';
import { AppError } from '../lib/errors';
import type { Todo, TodoWithRelations, PaginatedResult, PaginationParams } from '../types';

export class TodoService {
  constructor(
    private todoRepo: ITodoRepository,
    private categoryRepo: ICategoryRepository,
    private tagRepo: ITagRepository,
  ) {}

  async list(userId: string, query: FindTodosInput & PaginationParams): Promise<PaginatedResult<TodoWithRelations>> {
    return this.todoRepo.findByUserId({ ...query, userId });
  }

  async getById(id: string, userId: string): Promise<TodoWithRelations> {
    const todo = await this.todoRepo.findById(id);
    if (!todo) throw AppError.notFound('Todo');
    if (todo.userId !== userId) throw AppError.forbidden('You do not have access to this todo');
    return todo;
  }

  async create(userId: string, data: Omit<CreateTodoInput, 'id' | 'userId'>): Promise<Todo> {
    if (data.categoryId) {
      const category = await this.categoryRepo.findById(data.categoryId);
      if (!category) throw AppError.validation('Category not found');
    }

    if (data.tagIds && data.tagIds.length > 0) {
      const foundTags = await this.tagRepo.findByIds(data.tagIds);
      if (foundTags.length !== data.tagIds.length) throw AppError.validation('One or more tags not found');
    }

    return this.todoRepo.create({ id: uuidv4(), userId, ...data });
  }

  async update(id: string, userId: string, data: UpdateTodoInput): Promise<Todo> {
    await this.getById(id, userId);

    if (data.categoryId) {
      const category = await this.categoryRepo.findById(data.categoryId);
      if (!category) throw AppError.validation('Category not found');
    }

    if (data.tagIds && data.tagIds.length > 0) {
      const foundTags = await this.tagRepo.findByIds(data.tagIds);
      if (foundTags.length !== data.tagIds.length) throw AppError.validation('One or more tags not found');
    }

    return this.todoRepo.update(id, data);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.getById(id, userId);
    await this.todoRepo.delete(id);
  }

  async batch(userId: string, action: 'complete-all' | 'delete-completed'): Promise<{ affected: number }> {
    if (action === 'complete-all') {
      return { affected: await this.todoRepo.completeAllByUserId(userId) };
    }
    if (action === 'delete-completed') {
      return { affected: await this.todoRepo.deleteCompletedByUserId(userId) };
    }
    throw AppError.validation('Invalid batch action');
  }
}
