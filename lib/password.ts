import {
  randomBytes,
  scrypt,
  timingSafeEqual,
  type ScryptOptions,
} from "node:crypto";

/* promisify() collapses scrypt to its 3-argument overload and loses the
   options object, so it is wrapped by hand instead. */
function scryptAsync(
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, options, (err, key) =>
      err ? reject(err) : resolve(key),
    );
  });
}

/* Password hashing on Node's built-in scrypt.
 *
 * Not bcrypt, and the reason is not preference: bcrypt ships a compiled
 * .node binary, and Windows Smart App Control on the machine this is
 * developed on refuses to load unsigned native modules (the same wall that
 * killed vitest earlier in this project). scrypt is compiled into Node
 * itself, so there is no separate binary to block, no dependency to install,
 * and it is a memory-hard KDF designed for exactly this.
 *
 * Stored as scrypt$N$r$p$salt$hash, all base64. Keeping the parameters in
 * the string means a future increase in cost does not invalidate existing
 * hashes: old rows still verify with the parameters they were written with.
 */

const N = 16384; // CPU/memory cost. ~100ms per hash on a laptop.
const R = 8;
const P = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEYLEN, {
    N,
    r: R,
    p: P,
    // scrypt needs roughly 128 * N * r bytes; Node's default cap sits below
    // that at these parameters and throws without this raised.
    maxmem: 256 * N * R,
  });
  return [
    "scrypt",
    N,
    R,
    P,
    salt.toString("base64"),
    key.toString("base64"),
  ].join("$");
}

/**
 * Constant-time verification. Returns false for anything malformed rather
 * than throwing, so a corrupt row reads as "wrong password" instead of
 * turning into a 500 that tells an attacker they found something.
 */
export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  try {
    const [scheme, n, r, p, saltB64, keyB64] = stored.split("$");
    if (scheme !== "scrypt") return false;

    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(keyB64, "base64");
    if (salt.length === 0 || expected.length === 0) return false;

    const actual = await scryptAsync(password, salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 256 * Number(n) * Number(r),
    });

    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
