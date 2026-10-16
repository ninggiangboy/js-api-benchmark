import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { config } from "./config.js";

const key = new TextEncoder().encode(config.jwtSecret);

export async function signToken(userId: number): Promise<string> {
  return new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setSubject(String(userId))
    .setIssuedAt().setExpirationTime("30d").sign(key);
}

/** Returns the user id from an `Authorization: Bearer` header, or null if missing/invalid. */
export async function authenticate(header: string | null | undefined): Promise<number | null> {
  if (!header || !header.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(header.slice(7), key, { algorithms: ["HS256"] });
    const id = Number(payload.sub);
    return Number.isInteger(id) ? id : null;
  } catch {
    return null;
  }
}

const SCRYPT = { N: 4096, r: 8, p: 1 } as const;

function scryptAsync(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) =>
    scrypt(password, salt, 32, SCRYPT, (err, derived) => (err ? reject(err) : resolve(derived))));
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await scryptAsync(password, salt)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [saltHex, hashHex] = stored.split(":");
  const expected = Buffer.from(hashHex, "hex");
  const actual = await scryptAsync(password, Buffer.from(saltHex, "hex"));
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
