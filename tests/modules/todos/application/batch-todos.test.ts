import { describe, it, expect, beforeEach, vi } from 'vitest';
import { batchTodos } from '../../../../src/modules/todos/application/batch-todos';
import { createMockTodoRepo, adminUser } from '../../../setup';

describe('batchTodos', () => {
  const mockTodoRepo = createMockTodoRepo();
  const run = batchTodos({ todoRepo: mockTodoRepo });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('completes all todos', async () => {
    mockTodoRepo.completeAllByUserId.mockResolvedValue(3);
    const result = await run({ userId: adminUser.id, action: 'complete-all' });
    expect(result.affected).toBe(3);
  });

  it('deletes completed todos', async () => {
    mockTodoRepo.deleteCompletedByUserId.mockResolvedValue(2);
    const result = await run({ userId: adminUser.id, action: 'delete-completed' });
    expect(result.affected).toBe(2);
  });

  it('throws for invalid action', async () => {
    await expect(run({ userId: adminUser.id, action: 'invalid-action' as never })).rejects.toThrow(
      'Invalid batch action',
    );
  });
});
