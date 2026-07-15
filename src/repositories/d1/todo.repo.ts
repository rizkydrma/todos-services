import { eq, and, like, sql, asc, desc } from 'drizzle-orm';
import { todos, todoTags } from '../../db/schema';
import type { DbClient } from '../../db';
import type { ITodoRepository, FindTodosInput, CreateTodoInput, UpdateTodoInput } from '../interfaces/todo.repo';
import type { Todo, TodoWithRelations, PaginatedResult, PaginationParams } from '../../types';
import { paginate } from '../../lib/pagination';

export class D1TodoRepository implements ITodoRepository {
  constructor(private db: DbClient) {}

  async findById(id: string): Promise<TodoWithRelations | null> {
    const result = await this.db.query.todos.findFirst({
      where: eq(todos.id, id),
      with: {
        category: true,
        todoTags: { with: { tag: true } },
      },
    });

    if (!result) return null;

    return {
      ...result,
      tags: result.todoTags.map((tt) => tt.tag),
    } as TodoWithRelations;
  }

  async findByUserId(input: FindTodosInput & PaginationParams): Promise<PaginatedResult<TodoWithRelations>> {
    const conditions = [eq(todos.userId, input.userId)];

    if (input.status === 'completed') conditions.push(eq(todos.completed, true));
    else if (input.status === 'active') conditions.push(eq(todos.completed, false));

    if (input.categoryId) conditions.push(eq(todos.categoryId, input.categoryId));
    if (input.priority) conditions.push(eq(todos.priority, input.priority));
    if (input.search) conditions.push(like(todos.title, `%${input.search}%`));

    const where = and(...conditions);
    const offset = (input.page - 1) * input.limit;

    let orderBy;
    const sort = input.sort ?? '-createdAt';
    const direction = sort.startsWith('-') ? 'desc' : 'asc';
    const column = sort.replace(/^-/, '');

    if (column === 'createdAt') orderBy = direction === 'desc' ? desc(todos.createdAt) : asc(todos.createdAt);
    else if (column === 'dueDate') orderBy = direction === 'desc' ? desc(todos.dueDate) : asc(todos.dueDate);
    else if (column === 'priority') orderBy = direction === 'desc' ? desc(todos.priority) : asc(todos.priority);
    else orderBy = desc(todos.createdAt);

    const [rawData, countResult] = await Promise.all([
      this.db.query.todos.findMany({
        where,
        with: {
          category: true,
          todoTags: { with: { tag: true } },
        },
        limit: input.limit,
        offset,
        orderBy,
      }),
      this.db
        .select({ count: sql<number>`count(*)` })
        .from(todos)
        .where(where),
    ]);

    let mapped = rawData.map((t) => ({
      ...t,
      tags: t.todoTags.map((tt) => tt.tag),
    })) as TodoWithRelations[];

    let total = countResult[0]?.count ?? 0;

    // Tag filter in memory (junction table)
    if (input.tagId) {
      mapped = mapped.filter((t) => t.tags.some((tag) => tag.id === input.tagId));
      total = mapped.length;
      mapped = mapped.slice(0, input.limit);
    }

    return paginate(mapped, total, {
      page: input.page,
      limit: input.limit,
    });
  }

  async create(data: CreateTodoInput): Promise<Todo> {
    const now = new Date().toISOString();
    const { tagIds, ...todoData } = data;

    const result = await this.db
      .insert(todos)
      .values({
        ...todoData,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (tagIds && tagIds.length > 0) {
      await this.db.insert(todoTags).values(tagIds.map((tagId) => ({ todoId: result[0].id, tagId })));
    }

    return result[0];
  }

  async update(id: string, data: UpdateTodoInput): Promise<Todo> {
    const now = new Date().toISOString();
    const { tagIds, ...todoData } = data;

    const result = await this.db
      .update(todos)
      .set({ ...todoData, updatedAt: now })
      .where(eq(todos.id, id))
      .returning();

    if (tagIds !== undefined) {
      await this.db.delete(todoTags).where(eq(todoTags.todoId, id));
      if (tagIds.length > 0) {
        await this.db.insert(todoTags).values(tagIds.map((tagId) => ({ todoId: id, tagId })));
      }
    }

    return result[0];
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(todos).where(eq(todos.id, id));
  }

  async deleteCompletedByUserId(userId: string): Promise<number> {
    const result = await this.db.delete(todos).where(and(eq(todos.userId, userId), eq(todos.completed, true)));
    return result.meta?.rows_written ?? 0;
  }

  async completeAllByUserId(userId: string): Promise<number> {
    const now = new Date().toISOString();
    const result = await this.db
      .update(todos)
      .set({ completed: true, updatedAt: now })
      .where(and(eq(todos.userId, userId), eq(todos.completed, false)));
    return result.meta?.rows_written ?? 0;
  }
}
