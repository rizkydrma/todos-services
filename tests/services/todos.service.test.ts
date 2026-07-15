import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TodoService } from '../../src/services/todos.service';
import { createMockTodoRepo, createMockCategoryRepo, createMockTagRepo } from '../setup';
import { adminUser, sampleTodo, sampleCategory, sampleTag } from '../setup';

describe('TodoService', () => {
  const mockTodoRepo = createMockTodoRepo();
  const mockCategoryRepo = createMockCategoryRepo();
  const mockTagRepo = createMockTagRepo();
  const service = new TodoService(mockTodoRepo, mockCategoryRepo, mockTagRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getById', () => {
    it('returns todo when user owns it', async () => {
      const todoWithRelations = { ...sampleTodo, category: null, tags: [] };
      mockTodoRepo.findById.mockResolvedValue(todoWithRelations);

      const result = await service.getById(sampleTodo.id, sampleTodo.userId);
      expect(result.id).toBe(sampleTodo.id);
    });

    it('throws NOT_FOUND when todo does not exist', async () => {
      mockTodoRepo.findById.mockResolvedValue(null);
      await expect(service.getById('unknown', adminUser.id)).rejects.toThrow('Todo not found');
    });

    it('throws FORBIDDEN when user does not own the todo', async () => {
      const todoWithRelations = { ...sampleTodo, userId: 'other-user', category: null, tags: [] };
      mockTodoRepo.findById.mockResolvedValue(todoWithRelations);

      await expect(service.getById(sampleTodo.id, adminUser.id)).rejects.toThrow('You do not have access to this todo');
    });
  });

  describe('create', () => {
    it('creates todo successfully without category/tags', async () => {
      mockTodoRepo.create.mockResolvedValue(sampleTodo);

      const result = await service.create(adminUser.id, {
        title: 'A new task',
        priority: 'medium',
      });

      expect(result.title).toBe('Test Todo'); // match mock's return value
    });

    it('validates category exists when categoryId provided', async () => {
      mockCategoryRepo.findById.mockResolvedValue(null);

      await expect(
        service.create(adminUser.id, {
          title: 'Test',
          priority: 'low',
          categoryId: 'non-existent',
        }),
      ).rejects.toThrow('Category not found');
    });

    it('validates tags exist when tagIds provided', async () => {
      mockCategoryRepo.findById.mockResolvedValue(sampleCategory);
      mockTagRepo.findByIds.mockResolvedValue([sampleTag]);
      mockTodoRepo.create.mockResolvedValue(sampleTodo);

      const result = await service.create(adminUser.id, {
        title: 'Test',
        priority: 'high',
        categoryId: sampleCategory.id,
        tagIds: [sampleTag.id],
      });

      expect(result).toBeDefined();
    });

    it('throws when some tags not found', async () => {
      mockTagRepo.findByIds.mockResolvedValue([]);

      await expect(
        service.create(adminUser.id, {
          title: 'Test',
          priority: 'medium',
          tagIds: ['unknown-tag'],
        }),
      ).rejects.toThrow('One or more tags not found');
    });
  });

  describe('batch', () => {
    it('completes all todos', async () => {
      mockTodoRepo.completeAllByUserId.mockResolvedValue(3);

      const result = await service.batch(adminUser.id, 'complete-all');
      expect(result.affected).toBe(3);
    });

    it('deletes completed todos', async () => {
      mockTodoRepo.deleteCompletedByUserId.mockResolvedValue(2);

      const result = await service.batch(adminUser.id, 'delete-completed');
      expect(result.affected).toBe(2);
    });

    it('throws for invalid action', async () => {
      await expect(service.batch(adminUser.id, 'invalid-action' as never)).rejects.toThrow('Invalid batch action');
    });
  });
});
