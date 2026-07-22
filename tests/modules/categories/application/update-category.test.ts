import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateCategory } from '../../../../src/modules/categories/application/update-category';
import { createMockCategoryRepo, sampleCategory } from '../../../setup';

describe('updateCategory', () => {
  const mockRepo = createMockCategoryRepo();
  const run = updateCategory({ categoryRepo: mockRepo });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NOT_FOUND when updating non-existent category', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(run({ id: 'unknown', data: { name: 'New' } })).rejects.toThrow('Category not found');
  });

  it('updates existing category', async () => {
    mockRepo.findById.mockResolvedValue(sampleCategory);
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue({ ...sampleCategory, name: 'Updated' });

    const result = await run({ id: sampleCategory.id, data: { name: 'Updated' } });
    expect(result.name).toBe('Updated');
  });
});
