import { bytesToBase64 } from './encoding';

const OTP_DIGITS = 6;

/** CSPRNG 6-digit string, zero-padded. */
export function generateOtpCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0]! % 1_000_000;
  return n.toString().padStart(OTP_DIGITS, '0');
}

/** SHA-256 base64 of code; sufficient for short-lived OTP with rate limits. */
export async function hashOtp(code: string): Promise<string> {
  const data = new TextEncoder().encode(code);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return bytesToBase64(digest);
}

export async function verifyOtp(code: string, codeHash: string): Promise<boolean> {
  const h = await hashOtp(code);
  if (h.length !== codeHash.length) return false;
  let diff = 0;
  for (let i = 0; i < h.length; i++) diff |= h.charCodeAt(i)! ^ codeHash.charCodeAt(i)!;
  return diff === 0;
}

export const OTP_TTL_MS = 10 * 60 * 1000;
export const OTP_MAX_ATTEMPTS = 5;
