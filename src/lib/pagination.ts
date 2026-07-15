import type { PaginatedResult, PaginationParams } from '../types';

export function paginate<T>(data: T[], total: number, params: PaginationParams): PaginatedResult<T> {
  return {
    data,
    meta: {
      page: params.page,
      limit: params.limit,
      total,
      totalPages: Math.ceil(total / params.limit),
    },
  };
}
