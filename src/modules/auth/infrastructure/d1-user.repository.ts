import { eq, like, or, and, sql } from 'drizzle-orm';
import { users } from '../../../db/schema';
import type { DbClient } from '../../../db';
import type { CreateUserInput, IUserRepository, UpdateUserInput } from '../application/ports';
import type { PaginatedResult, PaginationParams, User } from '../../../types';
import { paginate } from '../../../lib/pagination';

export class D1UserRepository implements IUserRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findByFirebaseUid(firebaseUid: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.firebaseUid, firebaseUid)).limit(1);
    return result[0] ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const result = await this.db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  }

  async findMany(params: PaginationParams & { search?: string }): Promise<PaginatedResult<User>> {
    const conditions = [];
    if (params.search) {
      conditions.push(or(like(users.name, `%${params.search}%`), like(users.email, `%${params.search}%`)));
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const offset = (params.page - 1) * params.limit;

    const [data, countResult] = await Promise.all([
      this.db.select().from(users).where(where).limit(params.limit).offset(offset),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(where),
    ]);

    return paginate(data, countResult[0]?.count ?? 0, params);
  }

  async create(data: CreateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const result = await this.db
      .insert(users)
      .values({
        ...data,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return result[0];
  }

  async update(id: string, data: UpdateUserInput): Promise<User> {
    const now = new Date().toISOString();
    const result = await this.db
      .update(users)
      .set({ ...data, updatedAt: now })
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(users).where(eq(users.id, id));
  }
}
