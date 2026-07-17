import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password';

describe('password', () => {
  it('hashes and verifies password', async () => {
    const hash = await hashPassword('my-secret-password');
    expect(hash.startsWith('pbkdf2$')).toBe(true);
    expect(await verifyPassword('my-secret-password', hash)).toBe(true);
    expect(await verifyPassword('wrong', hash)).toBe(false);
  });

  it('rejects malformed stored hash', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
  });
});
