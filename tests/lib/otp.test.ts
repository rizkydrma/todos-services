import { describe, expect, it } from 'vitest';
import { generateOtpCode, hashOtp, verifyOtp } from '../../src/lib/otp';

describe('otp', () => {
  it('generates 6 digit numeric code', () => {
    const code = generateOtpCode();
    expect(code).toMatch(/^\d{6}$/);
  });

  it('verifies matching code', async () => {
    const code = '123456';
    const hash = await hashOtp(code);
    expect(await verifyOtp(code, hash)).toBe(true);
    expect(await verifyOtp('000000', hash)).toBe(false);
  });
});
