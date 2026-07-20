import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TagService } from '../../src/services/tags.service';
import { createMockTagRepo } from '../setup';
import { sampleTag } from '../setup';

describe('TagService', () => {
  const mockRepo = createMockTagRepo();
  const service = new TagService(mockRepo);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists all tags', async () => {
    mockRepo.findMany.mockResolvedValue([sampleTag]);
    const result = await service.list();
    expect(result).toHaveLength(1);
  });

  it('creates tag', async () => {
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(sampleTag);

    const result = await service.create({
      name: 'urgent',
      color: '#EF4444',
    });
    expect(result.name).toBe('urgent');
  });

  it('throws CONFLICT on duplicate name', async () => {
    mockRepo.findByName.mockResolvedValue(sampleTag);
    await expect(service.create({ name: 'urgent' })).rejects.toThrow('already exists');
  });

  it('throws NOT_FOUND on updating non-existent tag', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(service.update('unknown', { name: 'New' })).rejects.toThrow('Tag not found');
  });

  it('updates existing tag', async () => {
    mockRepo.findById.mockResolvedValue(sampleTag);
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue({ ...sampleTag, name: 'Updated' });

    const result = await service.update(sampleTag.id, { name: 'Updated' });
    expect(result.name).toBe('Updated');
  });

  it('deletes existing tag', async () => {
    mockRepo.findById.mockResolvedValue(sampleTag);
    mockRepo.delete.mockResolvedValue(undefined);

    await service.delete(sampleTag.id);

    expect(mockRepo.delete).toHaveBeenCalledWith(sampleTag.id);
  });
});
