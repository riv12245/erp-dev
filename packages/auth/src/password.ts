/**
 * Password hashing utilities using the Web Crypto API (PBKDF2-SHA256).
 * Dependency-free so it works in Node, web and React Native.
 */

export interface PasswordHash {
  readonly algorithm: 'pbkdf2-sha256';
  readonly iterations: number;
  readonly salt: string;
  readonly hash: string;
}

const ITERATIONS = 100_000;
const KEY_LENGTH_BYTES = 32;
const SALT_LENGTH_BYTES = 16;

function toBytes(value: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(value) as Uint8Array<ArrayBuffer>;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length) as Uint8Array<ArrayBuffer>;
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function pbkdf2(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array<ArrayBuffer>> {
  const keyMaterial = await crypto.subtle.importKey('raw', toBytes(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: salt.buffer as ArrayBuffer, iterations, hash: 'SHA-256' },
    keyMaterial,
    KEY_LENGTH_BYTES * 8,
  );
  return new Uint8Array(bits);
}

/** Generates a random salt. */
export function generateSalt(): string {
  const salt = new Uint8Array(SALT_LENGTH_BYTES);
  crypto.getRandomValues(salt);
  return toBase64(salt);
}

/** Hashes a plaintext password into a portable PasswordHash object. */
export async function hashPassword(password: string, iterations = ITERATIONS): Promise<PasswordHash> {
  const salt = generateSalt();
  const derived = await pbkdf2(password, fromBase64(salt), iterations);
  return { algorithm: 'pbkdf2-sha256', iterations, salt, hash: toBase64(derived) };
}

/** Verifies a plaintext password against a stored PasswordHash. */
export async function verifyPassword(password: string, stored: PasswordHash): Promise<boolean> {
  if (stored.algorithm !== 'pbkdf2-sha256') return false;
  const derived = await pbkdf2(password, fromBase64(stored.salt), stored.iterations);
  const candidate = toBase64(derived);
  const a = candidate;
  const b = stored.hash;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Serializes a PasswordHash to a storable string. */
export function serializeHash(value: PasswordHash): string {
  return `${value.algorithm}:${value.iterations}:${value.salt}:${value.hash}`;
}

/** Parses a serialized password hash string. Returns null when malformed. */
export function parseHash(value: string): PasswordHash | null {
  const parts = value.split(':');
  if (parts.length !== 4) return null;
  const iterations = Number(parts[1]);
  if (!Number.isInteger(iterations) || iterations <= 0) return null;
  return { algorithm: parts[0] as PasswordHash['algorithm'], iterations, salt: parts[2], hash: parts[3] };
}