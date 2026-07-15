import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CategoryService } from '../../src/services/categories.service';
import { createMockCategoryRepo } from '../setup';
import { sampleCategory } from '../setup';

describe('CategoryService', () => {
  const mockRepo = createMockCategoryRepo();
  const service = new CategoryService(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists all categories', async () => {
    mockRepo.findMany.mockResolvedValue([sampleCategory]);
    const result = await service.list();
    expect(result).toHaveLength(1);
  });

  it('creates category', async () => {
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(sampleCategory);

    const result = await service.create({ name: 'Work', color: '#3B82F6' });
    expect(result.name).toBe('Work');
  });

  it('throws CONFLICT when creating duplicate name', async () => {
    mockRepo.findByName.mockResolvedValue(sampleCategory);
    await expect(service.create({ name: 'Work' })).rejects.toThrow('already exists');
  });

  it('throws NOT_FOUND when updating non-existent category', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.update('unknown', { name: 'New' })).rejects.toThrow('Category not found');
  });

  it('throws NOT_FOUND when deleting non-existent category', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.delete('unknown')).rejects.toThrow('Category not found');
  });

  it('updates existing category', async () => {
    mockRepo.findById.mockResolvedValue(sampleCategory);
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue({
      ...sampleCategory,
      name: 'Updated',
    });

    const result = await service.update(sampleCategory.id, {
      name: 'Updated',
    });
    expect(result.name).toBe('Updated');
  });

  it('deletes existing category', async () => {
    mockRepo.findById.mockResolvedValue(sampleCategory);
    await expect(service.delete(sampleCategory.id)).resolves.not.toThrow();
  });
});
