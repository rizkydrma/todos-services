import { eq } from 'drizzle-orm';
import { categories } from '../../db/schema';
import type { DbClient } from '../../db';
import type { ICategoryRepository, CreateCategoryInput, UpdateCategoryInput } from '../interfaces/category.repo';
import type { Category } from '../../types';

export class D1CategoryRepository implements ICategoryRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<Category | null> {
    const result = await this.db.select().from(categories).where(eq(categories.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByName(name: string): Promise<Category | null> {
    const result = await this.db.select().from(categories).where(eq(categories.name, name)).limit(1);
    return result[0] ?? null;
  }

  async findMany(): Promise<Category[]> {
    return this.db.select().from(categories);
  }

  async create(data: CreateCategoryInput): Promise<Category> {
    const now = new Date().toISOString();
    const result = await this.db
      .insert(categories)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0];
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const now = new Date().toISOString();
    const result = await this.db
      .update(categories)
      .set({ ...data, updatedAt: now })
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(categories).where(eq(categories.id, id));
  }
}
