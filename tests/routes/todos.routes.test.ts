import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app/create-app';

describe('Todos Routes', () => {
  const app = createApp();

  it('GET /todos — returns 401 without auth', async () => {
    const res = await app.request('/todos');
    expect(res.status).toBe(401);
  });

  it('POST /todos — returns 401 without auth (auth runs before validation)', async () => {
    const res = await app.request('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });

  it('POST /todos — returns 401 without auth even with valid body', async () => {
    const res = await app.request('/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Test', priority: 'low' }),
    });
    expect(res.status).toBe(401);
  });

  it('PATCH /todos/batch — returns 401 without auth (auth runs before validation)', async () => {
    const res = await app.request('/todos/batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'invalid-action' }),
    });
    expect(res.status).toBe(401);
  });

  it('PATCH /todos/batch — returns 401 without auth for empty body', async () => {
    const res = await app.request('/todos/batch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});
