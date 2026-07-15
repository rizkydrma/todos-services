import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app';

describe('Tags Routes', () => {
  const app = createApp();

  it('GET /tags — returns 401 without auth', async () => {
    const res = await app.request('/tags');
    expect(res.status).toBe(401);
  });

  it('DELETE /tags/:id — returns 401 without auth', async () => {
    const res = await app.request('/tags/any-id', { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('POST /tags — returns 401 without auth for empty body', async () => {
    const res = await app.request('/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(401);
  });
});
