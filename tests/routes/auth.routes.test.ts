import { describe, it, expect } from 'vitest';
import { createApp } from '../../src/app';

describe('Auth Routes', () => {
  const app = createApp();

  it('POST /auth/register — returns 400 for empty body', async () => {
    const res = await app.request('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/login — returns 400 for missing fields', async () => {
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/google — returns 400 for missing idToken', async () => {
    const res = await app.request('/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/refresh — returns 400 for missing refreshToken', async () => {
    const res = await app.request('/auth/refresh', {
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
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/verify-email — returns 400 for empty body', async () => {
    const res = await app.request('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/verify-email — returns 400 for non-6-digit code', async () => {
    const res = await app.request('/auth/verify-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'budi@yahoo.com', code: '12345' }),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/resend-verification — returns 400 for missing email', async () => {
    const res = await app.request('/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('POST /auth/resend-verification — returns 400 for invalid email', async () => {
    const res = await app.request('/auth/resend-verification', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email' }),
    });
    expect(res.status).toBe(400);
  });
});
