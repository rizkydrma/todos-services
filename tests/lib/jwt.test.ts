import { describe, expect, it } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../../src/lib/jwt';

const SECRET = 'test-jwt-secret-at-least-32-chars!!';

describe('jwt', () => {
  it('signs and verifies access token', async () => {
    const token = await signAccessToken({ sub: 'user-1', role: 'user', email: 'a@b.com' }, SECRET);
    const payload = await verifyAccessToken(token, SECRET);
    expect(payload.sub).toBe('user-1');
    expect(payload.role).toBe('user');
    expect(payload.type).toBe('access');
  });

  it('signs and verifies refresh token', async () => {
    const token = await signRefreshToken({ sub: 'user-1', jti: 'jti-1' }, SECRET);
    const payload = await verifyRefreshToken(token, SECRET);
    expect(payload.sub).toBe('user-1');
    expect(payload.jti).toBe('jti-1');
    expect(payload.type).toBe('refresh');
  });

  it('rejects access token used as refresh', async () => {
    const access = await signAccessToken({ sub: 'user-1', role: 'user', email: 'a@b.com' }, SECRET);
    await expect(verifyRefreshToken(access, SECRET)).rejects.toThrow();
  });
});
