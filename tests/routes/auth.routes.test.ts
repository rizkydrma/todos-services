import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app';

describe('Auth Routes', () => {
  const app = createApp();

  it('POST /auth/register — returns 400 for empty body (no auth needed)', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login — returns 400 for missing token (no auth needed)', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('GET /auth/me — returns 401 without auth header', async () => {
    const res = await app.request('/auth/me');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('GET /auth/me — returns 401 with malformed auth header', async () => {
    const res = await app.request('/auth/me', {
      headers: { Authorization: 'InvalidFormat' },
    });
    expect(res.status).toBe(401);
  });

  it('POST /auth/register — validates body structure', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extraField: 'test' }),
    });
    expect(res.status).toBe(400);
  });
});
