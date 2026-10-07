import "server-only";

import { randomBytes } from "node:crypto";
import { argon2id, type HashOptions, hash, verify } from "argon2";

const passwordOptions: HashOptions = {
  type: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
};

let dummyHash: Promise<string> | undefined;

export function hashPassword(password: string): Promise<string> {
  return hash(password, passwordOptions);
}

export async function verifyPassword(
  passwordHash: string | null,
  password: string,
): Promise<boolean> {
  // Run the same expensive verification for unknown users and guests.
  dummyHash ??= hashPassword(randomBytes(32).toString("hex"));
  const digest: string = passwordHash ?? (await dummyHash);
  try {
    const matches: boolean = await verify(digest, password);
    return passwordHash !== null && matches;
  } catch {
    return false;
  }
}
