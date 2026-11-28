import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';

const options = { N: 2 ** 17, r: 8, p: 1, maxmem: 160 * 1024 * 1024 };
const keyLength = 64;

function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await derive(password, salt);
  return salt.toString('hex') + ':' + key.toString('hex');
}

export async function verifyPassword(password: string, hash?: string) {
  // Derive a key even when the email has no account.
  const [salt, digest] = hash?.split(':') ?? [];
  const usable = /^[a-f0-9]{32}$/.test(salt ?? '') && /^[a-f0-9]{128}$/.test(digest ?? '');
  const key = await derive(password, usable ? Buffer.from(salt, 'hex') : Buffer.alloc(16));
  return usable && timingSafeEqual(key, Buffer.from(digest, 'hex'));
}
