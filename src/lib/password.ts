import { base64ToBytes, bytesToBase64 } from './encoding';

const ITERATIONS = 100_000;
const SALT_BYTES = 16;
const KEY_BITS = 256;

async function deriveKey(password: string, salt: Uint8Array, iterations: number): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    baseKey,
    KEY_BITS,
  );
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  }
  return diff === 0;
}

/** Format: pbkdf2$iterations$saltB64$hashB64 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const derived = await deriveKey(password, salt, ITERATIONS);
  return `pbkdf2$${ITERATIONS}$${bytesToBase64(salt)}$${bytesToBase64(derived)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;

  const algo = parts[0];
  const iterationsPart = parts[1];
  const saltPart = parts[2];
  const hashPart = parts[3];
  if (algo !== 'pbkdf2' || !iterationsPart || !saltPart || !hashPart) return false;

  const iterations = Number(iterationsPart);
  if (!Number.isFinite(iterations) || iterations < 1) return false;

  const salt = base64ToBytes(saltPart);
  const expected = base64ToBytes(hashPart);
  const derived = new Uint8Array(await deriveKey(password, salt, iterations));
  return timingSafeEqual(derived, expected);
}
