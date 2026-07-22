import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTodo } from '../../../../src/modules/todos/application/create-todo';
import {
  createMockTodoRepo,
  createMockCategoryRepo,
  createMockTagRepo,
  adminUser,
  sampleTodo,
  sampleCategory,
  sampleTag,
} from '../../../setup';

describe('createTodo', () => {
  const mockTodoRepo = createMockTodoRepo();
  const mockCategoryRepo = createMockCategoryRepo();
  const mockTagRepo = createMockTagRepo();
  const ids = { next: vi.fn(() => 'generated-id') };
  const run = createTodo({
    todoRepo: mockTodoRepo,
    categoryReader: mockCategoryRepo,
    tagReader: mockTagRepo,
    ids,
  });

  beforeEach(() => {
    vi.clearAllMocks();
    ids.next.mockReturnValue('generated-id');
  });

  it('creates todo successfully without category/tags', async () => {
    mockTodoRepo.create.mockResolvedValue(sampleTodo);

    const result = await run({
      userId: adminUser.id,
      data: { title: 'A new task', priority: 'medium' },
    });

    expect(result.title).toBe('Test Todo');
    expect(mockTodoRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'generated-id', userId: adminUser.id, title: 'A new task' }),
    );
  });

  it('validates category exists when categoryId provided', async () => {
    mockCategoryRepo.findById.mockResolvedValue(null);

    await expect(
      run({
        userId: adminUser.id,
        data: { title: 'Test', priority: 'low', categoryId: 'non-existent' },
      }),
    ).rejects.toThrow('Category not found');
  });

  it('validates tags exist when tagIds provided', async () => {
    mockCategoryRepo.findById.mockResolvedValue(sampleCategory);
    mockTagRepo.findByIds.mockResolvedValue([sampleTag]);
    mockTodoRepo.create.mockResolvedValue(sampleTodo);

    const result = await run({
      userId: adminUser.id,
      data: {
        title: 'Test',
        priority: 'high',
        categoryId: sampleCategory.id,
        tagIds: [sampleTag.id],
      },
    });

    expect(result).toBeDefined();
  });

  it('throws when some tags not found', async () => {
    mockTagRepo.findByIds.mockResolvedValue([]);

    await expect(
      run({
        userId: adminUser.id,
        data: { title: 'Test', priority: 'medium', tagIds: ['unknown-tag'] },
      }),
    ).rejects.toThrow('One or more tags not found');
  });
});
