import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteCategory } from '../../../../src/modules/categories/application/delete-category';
import { createMockCategoryRepo, sampleCategory } from '../../../setup';

describe('deleteCategory', () => {
  const mockRepo = createMockCategoryRepo();
  const run = deleteCategory({ categoryRepo: mockRepo });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NOT_FOUND when deleting non-existent category', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(run({ id: 'unknown' })).rejects.toThrow('Category not found');
  });

  it('deletes existing category', async () => {
    mockRepo.findById.mockResolvedValue(sampleCategory);
    mockRepo.delete.mockResolvedValue(undefined);

    await run({ id: sampleCategory.id });
    expect(mockRepo.delete).toHaveBeenCalledWith(sampleCategory.id);
  });
});
