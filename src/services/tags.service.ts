import { v4 as uuidv4 } from 'uuid';
import type { ITagRepository, CreateTagInput, UpdateTagInput } from '../repositories/interfaces/tag.repo';
import { AppError } from '../lib/errors';
import type { Tag } from '../types';

export class TagService {
  constructor(private tagRepo: ITagRepository) {}

  async list(): Promise<Tag[]> {
    return this.tagRepo.findMany();
  }

  async create(data: Omit<CreateTagInput, 'id'>): Promise<Tag> {
    const existing = await this.tagRepo.findByName(data.name);
    if (existing) throw AppError.conflict(`Tag "${data.name}" already exists`);
    return this.tagRepo.create({ id: uuidv4(), ...data });
  }

  async update(id: string, data: UpdateTagInput): Promise<Tag> {
    const tag = await this.tagRepo.findById(id);
    if (!tag) throw AppError.notFound('Tag');

    if (data.name && data.name !== tag.name) {
      const existing = await this.tagRepo.findByName(data.name);
      if (existing) throw AppError.conflict(`Tag "${data.name}" already exists`);
    }

    return this.tagRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const tag = await this.tagRepo.findById(id);
    if (!tag) throw AppError.notFound('Tag');
    await this.tagRepo.delete(id);
  }
}
