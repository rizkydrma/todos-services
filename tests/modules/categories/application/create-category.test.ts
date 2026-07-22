import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCategory } from '../../../../src/modules/categories/application/create-category';
import { createMockCategoryRepo, sampleCategory } from '../../../setup';

describe('createCategory', () => {
  const mockRepo = createMockCategoryRepo();
  const ids = { next: vi.fn(() => 'generated-id') };
  const run = createCategory({ categoryRepo: mockRepo, ids });

  beforeEach(() => {
    vi.clearAllMocks();
    ids.next.mockReturnValue('generated-id');
  });

  it('creates category', async () => {
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(sampleCategory);

    const result = await run({ name: 'Work', color: '#3B82F6' });
    expect(result.name).toBe('Work');
    expect(mockRepo.create).toHaveBeenCalledWith(expect.objectContaining({ id: 'generated-id', name: 'Work' }));
  });

  it('throws CONFLICT when creating duplicate name', async () => {
    mockRepo.findByName.mockResolvedValue(sampleCategory);
    await expect(run({ name: 'Work' })).rejects.toThrow('already exists');
  });
});
