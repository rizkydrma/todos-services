import { z } from 'zod';

// ── Auth ──
export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(6).max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(128),
});

export const googleLoginSchema = z.object({
  idToken: z.string().min(1),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const logoutSchema = z.object({
  refreshToken: z.string().min(1),
});

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{6}$/),
});

export const resendVerificationSchema = z.object({
  email: z.string().email(),
});

// ── Todo ──
export const createTodoSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
  dueDate: z.string().datetime().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(10).optional(),
});

export const updateTodoSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  completed: z.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  tagIds: z.array(z.string().uuid()).max(10).optional(),
});

export const todoQuerySchema = z.object({
  status: z.enum(['completed', 'active']).optional(),
  category: z.string().uuid().optional(),
  tag: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  search: z.string().max(100).optional(),
  sort: z.enum(['createdAt', '-createdAt', 'dueDate', '-dueDate', 'priority', '-priority']).default('-createdAt'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const batchTodoSchema = z.object({
  action: z.enum(['complete-all', 'delete-completed']),
});

// ── Category ──
export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(7).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(7).optional().nullable(),
});

// ── Tag ──
export const createTagSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().max(7).optional(),
});

export const updateTagSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().max(7).optional().nullable(),
});

// ── User (admin) ──
export const updateUserSchema = z.object({
  role: z.enum(['user', 'admin']),
});

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(100).optional(),
});
