import type { Category, Tag, Todo, TodoWithRelations } from '../../../types';

export type { Todo, TodoWithRelations, Category, Tag };

export type TodoId = string;
export type UserId = string;

export type TodoPriority = 'low' | 'medium' | 'high';
