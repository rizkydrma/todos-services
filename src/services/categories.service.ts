import { v4 as uuidv4 } from 'uuid';
import type { ICategoryRepository, CreateCategoryInput, UpdateCategoryInput } from '../repositories/interfaces/category.repo';
import { AppError } from '../lib/errors';
import type { Category } from '../types';

export class CategoryService {
  constructor(private categoryRepo: ICategoryRepository) {}

  async list(): Promise<Category[]> {
    return this.categoryRepo.findMany();
  }

  async create(data: Omit<CreateCategoryInput, 'id'>): Promise<Category> {
    const existing = await this.categoryRepo.findByName(data.name);
    if (existing) throw AppError.conflict(`Category "${data.name}" already exists`);
    return this.categoryRepo.create({ id: uuidv4(), ...data });
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw AppError.notFound('Category');

    if (data.name && data.name !== category.name) {
      const existing = await this.categoryRepo.findByName(data.name);
      if (existing) throw AppError.conflict(`Category "${data.name}" already exists`);
    }

    return this.categoryRepo.update(id, data);
  }

  async delete(id: string): Promise<void> {
    const category = await this.categoryRepo.findById(id);
    if (!category) throw AppError.notFound('Category');
    await this.categoryRepo.delete(id);
  }
}
