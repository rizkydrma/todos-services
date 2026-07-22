import { createTag } from './application/create-tag';
import { deleteTag } from './application/delete-tag';
import { listTags } from './application/list-tags';
import { updateTag } from './application/update-tag';
import type { IdGenerator, ITagRepository } from './application/ports';

export type TagsUseCases = {
  list: ReturnType<typeof listTags>;
  create: ReturnType<typeof createTag>;
  update: ReturnType<typeof updateTag>;
  delete: ReturnType<typeof deleteTag>;
};

export function buildTagsUseCases(deps: { tagRepo: ITagRepository; ids: IdGenerator }): TagsUseCases {
  return {
    list: listTags({ tagRepo: deps.tagRepo }),
    create: createTag({ tagRepo: deps.tagRepo, ids: deps.ids }),
    update: updateTag({ tagRepo: deps.tagRepo }),
    delete: deleteTag({ tagRepo: deps.tagRepo }),
  };
}
