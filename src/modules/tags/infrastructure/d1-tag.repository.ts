import { eq, inArray } from 'drizzle-orm';
import { tags } from '../../../db/schema';
import type { DbClient } from '../../../db';
import type { CreateTagInput, ITagRepository, UpdateTagInput } from '../application/ports';
import type { Tag } from '../../../types';

export class D1TagRepository implements ITagRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<Tag | null> {
    const result = await this.db.select().from(tags).where(eq(tags.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByName(name: string): Promise<Tag | null> {
    const result = await this.db.select().from(tags).where(eq(tags.name, name)).limit(1);
    return result[0] ?? null;
  }

  async findMany(): Promise<Tag[]> {
    return this.db.select().from(tags);
  }

  async findByIds(ids: string[]): Promise<Tag[]> {
    if (ids.length === 0) return [];
    return this.db.select().from(tags).where(inArray(tags.id, ids));
  }

  async create(data: CreateTagInput): Promise<Tag> {
    const now = new Date().toISOString();
    const result = await this.db
      .insert(tags)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0];
  }

  async update(id: string, data: UpdateTagInput): Promise<Tag> {
    const now = new Date().toISOString();
    const result = await this.db
      .update(tags)
      .set({ ...data, updatedAt: now })
      .where(eq(tags.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(tags).where(eq(tags.id, id));
  }
}
