import { describe, it, expect, beforeEach, vi } from 'vitest';
import { updateTag } from '../../../../src/modules/tags/application/update-tag';
import { createMockTagRepo, sampleTag } from '../../../setup';

describe('updateTag', () => {
  const mockRepo = createMockTagRepo();
  const run = updateTag({ tagRepo: mockRepo });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws NOT_FOUND on updating non-existent tag', async () => {
    mockRepo.findById.mockResolvedValue(null);
    await expect(run({ id: 'unknown', data: { name: 'New' } })).rejects.toThrow('Tag not found');
  });

  it('updates existing tag', async () => {
    mockRepo.findById.mockResolvedValue(sampleTag);
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.update.mockResolvedValue({ ...sampleTag, name: 'Updated' });

    const result = await run({ id: sampleTag.id, data: { name: 'Updated' } });
    expect(result.name).toBe('Updated');
  });
});
