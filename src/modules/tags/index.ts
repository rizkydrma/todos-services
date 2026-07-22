export { createTagsRoutes } from './http/routes';
export { buildTagsUseCases } from './container';
export type { TagsUseCases } from './container';
export type { ITagRepository, CreateTagInput, UpdateTagInput, IdGenerator } from './application/ports';
export type { Tag, TagId } from './domain/tag';
