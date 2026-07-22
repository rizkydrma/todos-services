import { describe, it, expect, beforeEach, vi } from 'vitest';
import { deleteTag } from '../../../../src/modules/tags/application/delete-tag';
import { createMockTagRepo, sampleTag } from '../../../setup';

describe('deleteTag', () => {
  const mockRepo = createMockTagRepo();
  const run = deleteTag({ tagRepo: mockRepo });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes existing tag', async () => {
    mockRepo.findById.mockResolvedValue(sampleTag);
    mockRepo.delete.mockResolvedValue(undefined);

    await run({ id: sampleTag.id });
    expect(mockRepo.delete).toHaveBeenCalledWith(sampleTag.id);
  });
});
