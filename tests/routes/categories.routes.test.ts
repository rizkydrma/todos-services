import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app/create-app';

describe('Categories Routes', () => {
  const app = createApp();

  it('GET /categories — returns 401 without auth', async () => {
    const res = await app.request('/categories');
    expect(res.status).toBe(401);
  });

  it('POST /categories — returns 401 without auth', async () => {
    const res = await app.request('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Category' }),
    });
    expect(res.status).toBe(401);
  });

  it('POST /categories — returns 401 without auth for empty body', async () => {
    const res = await app.request('/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});
