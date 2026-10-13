import { Injectable } from '@nestjs/common';
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import type { ScryptOptions } from 'node:crypto';

// scrypt with one of the parameter sets OWASP recommends (N=2^15, r=8, p=3),
// which needs about 32 MB per hash. The parameters travel with each hash, so
// they can be raised later without invalidating stored passwords.
const COST = 2 ** 15;
const BLOCK_SIZE = 8;
const PARALLELIZATION = 3;
const SALT_BYTES = 16;
const KEY_BYTES = 64;
const PREFIX = 'scrypt';

function deriveKey(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, key) =>
      error ? reject(error) : resolve(key),
    );
  });
}

function scryptOptions(N: number, r: number, p: number): ScryptOptions {
  // Node's default memory cap is 32 MB, just below what these parameters use.
  return { N, r, p, maxmem: 256 * N * r };
}

@Injectable()
export class PasswordHasher {
  /** Returns `scrypt$N$r$p$salt$key`, with salt and key in base64url. */
  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const key = await deriveKey(
      password,
      salt,
      KEY_BYTES,
      scryptOptions(COST, BLOCK_SIZE, PARALLELIZATION),
    );
    return [
      PREFIX,
      COST,
      BLOCK_SIZE,
      PARALLELIZATION,
      salt.toString('base64url'),
      key.toString('base64url'),
    ].join('$');
  }

  /** A malformed stored hash never matches; it does not throw. */
  async verify(password: string, storedHash: string): Promise<boolean> {
    const [prefix, cost, blockSize, parallelization, salt, key] =
      storedHash.split('$');
    const N = Number(cost);
    const r = Number(blockSize);
    const p = Number(parallelization);
    if (
      prefix !== PREFIX ||
      !salt ||
      !key ||
      ![N, r, p].every((value) => Number.isInteger(value) && value > 0)
    ) {
      return false;
    }

    const expected = Buffer.from(key, 'base64url');
    let actual: Buffer;
    try {
      actual = await deriveKey(
        password,
        Buffer.from(salt, 'base64url'),
        expected.length,
        scryptOptions(N, r, p),
      );
    } catch {
      // Parameters that scrypt rejects: the stored value is not one of ours.
      return false;
    }
    return timingSafeEqual(actual, expected);
  }
}
