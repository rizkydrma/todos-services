import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createTag } from '../../../../src/modules/tags/application/create-tag';
import { createMockTagRepo, sampleTag } from '../../../setup';

describe('createTag', () => {
  const mockRepo = createMockTagRepo();
  const ids = { next: vi.fn(() => 'generated-id') };
  const run = createTag({ tagRepo: mockRepo, ids });

  beforeEach(() => {
    vi.clearAllMocks();
    ids.next.mockReturnValue('generated-id');
  });

  it('creates tag', async () => {
    mockRepo.findByName.mockResolvedValue(null);
    mockRepo.create.mockResolvedValue(sampleTag);

    const result = await run({ name: 'urgent', color: '#EF4444' });
    expect(result.name).toBe('urgent');
  });

  it('throws CONFLICT on duplicate name', async () => {
    mockRepo.findByName.mockResolvedValue(sampleTag);
    await expect(run({ name: 'urgent' })).rejects.toThrow('already exists');
  });
});
