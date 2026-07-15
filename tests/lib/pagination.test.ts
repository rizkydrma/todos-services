import { describe, it, expect } from 'vitest';
import { paginate } from '../../src/lib/pagination';

describe('paginate', () => {
  const items = [
    { id: 'a', value: 1 },
    { id: 'b', value: 2 },
    { id: 'c', value: 3 },
    { id: 'd', value: 4 },
    { id: 'e', value: 5 },
  ];

  it('paginates first page correctly', () => {
    const result = paginate(items, 20, { page: 1, limit: 5 });
    expect(result.data).toEqual(items);
    expect(result.meta.page).toBe(1);
    expect(result.meta.limit).toBe(5);
    expect(result.meta.total).toBe(20);
    expect(result.meta.totalPages).toBe(4);
  });

  it('handles empty data', () => {
    const result = paginate([], 0, { page: 1, limit: 10 });
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(0);
    expect(result.meta.totalPages).toBe(0);
  });

  it('handles exact multiple of limit', () => {
    const result = paginate(items, 10, { page: 2, limit: 5 });
    expect(result.meta.page).toBe(2);
    expect(result.meta.totalPages).toBe(2);
  });

  it('handles remaining items on last page', () => {
    const result = paginate(items.slice(0, 3), 13, { page: 3, limit: 5 });
    expect(result.data).toHaveLength(3);
    expect(result.meta.totalPages).toBe(3);
  });
});
