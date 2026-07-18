import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  firebaseUid: text('firebase_uid').unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role', { enum: ['user', 'admin'] })
    .notNull()
    .default('user'),
  passwordHash: text('password_hash'),
  emailVerifiedAt: text('email_verified_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  todos: many(todos),
  refreshTokens: many(refreshTokens),
  verificationChallenges: many(emailVerificationChallenges),
}));

export const refreshTokens = sqliteTable('refresh_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  jti: text('jti').notNull().unique(),
  tokenHash: text('token_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  revokedAt: text('revoked_at'),
  createdAt: text('created_at').notNull(),
});

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, { fields: [refreshTokens.userId], references: [users.id] }),
}));

export const emailVerificationChallenges = sqliteTable('email_verification_challenges', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  codeHash: text('code_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  attemptCount: integer('attempt_count').notNull().default(0),
  createdAt: text('created_at').notNull(),
  consumedAt: text('consumed_at'),
});

export const emailVerificationChallengesRelations = relations(emailVerificationChallenges, ({ one }) => ({
  user: one(users, {
    fields: [emailVerificationChallenges.userId],
    references: [users.id],
  }),
}));

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const categoriesRelations = relations(categories, ({ many }) => ({
  todos: many(todos),
}));

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  color: text('color'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const tagsRelations = relations(tags, ({ many }) => ({
  todoTags: many(todoTags),
}));

export const todos = sqliteTable('todos', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id),
  title: text('title').notNull(),
  description: text('description'),
  completed: integer('completed', { mode: 'boolean' }).notNull().default(false),
  priority: text('priority', { enum: ['low', 'medium', 'high'] })
    .notNull()
    .default('medium'),
  dueDate: text('due_date'),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const todosRelations = relations(todos, ({ one, many }) => ({
  user: one(users, { fields: [todos.userId], references: [users.id] }),
  category: one(categories, { fields: [todos.categoryId], references: [categories.id] }),
  todoTags: many(todoTags),
}));

export const todoTags = sqliteTable(
  'todo_tags',
  {
    todoId: text('todo_id')
      .notNull()
      .references(() => todos.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.todoId, t.tagId] }),
  }),
);

export const todoTagsRelations = relations(todoTags, ({ one }) => ({
  todo: one(todos, { fields: [todoTags.todoId], references: [todos.id] }),
  tag: one(tags, { fields: [todoTags.tagId], references: [tags.id] }),
}));
