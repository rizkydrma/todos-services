import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getTodo } from '../../../../src/modules/todos/application/get-todo';
import { createMockTodoRepo, adminUser, sampleTodo } from '../../../setup';

describe('getTodo', () => {
  const mockTodoRepo = createMockTodoRepo();
  const run = getTodo({ todoRepo: mockTodoRepo });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns todo when user owns it', async () => {
    const todoWithRelations = { ...sampleTodo, category: null, tags: [] };
    mockTodoRepo.findById.mockResolvedValue(todoWithRelations);

    const result = await run({ id: sampleTodo.id, userId: sampleTodo.userId });
    expect(result.id).toBe(sampleTodo.id);
  });

  it('throws NOT_FOUND when todo does not exist', async () => {
    mockTodoRepo.findById.mockResolvedValue(null);
    await expect(run({ id: 'unknown', userId: adminUser.id })).rejects.toThrow('Todo not found');
  });

  it('throws FORBIDDEN when user does not own the todo', async () => {
    const todoWithRelations = { ...sampleTodo, userId: 'other-user', category: null, tags: [] };
    mockTodoRepo.findById.mockResolvedValue(todoWithRelations);

    await expect(run({ id: sampleTodo.id, userId: adminUser.id })).rejects.toThrow(
      'You do not have access to this todo',
    );
  });
});
