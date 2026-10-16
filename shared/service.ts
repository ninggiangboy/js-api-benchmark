import { authenticate, signToken, verifyPassword, hashPassword } from "./auth.js";
import * as db from "./db.js";
import { redis } from "./redis.js";
import { buildLargePayload, summarizeBulk, type BulkItem } from "./payload.js";

export { authenticate, buildLargePayload };

export const getUser = db.getUserById;
export const patchUser = db.patchUser;

export async function listPosts(q: { limit: number; offset: number; authorId?: number }) {
  const items = await db.listPosts(q.limit, q.offset, q.authorId);
  return { items, limit: q.limit, offset: q.offset };
}

let placeholderHash: Promise<string> | undefined;
export async function createUser(b: { email: string; name: string }) {
  placeholderHash ??= hashPassword("password123");
  return db.upsertUser(b.email, b.name, await placeholderHash);
}

export async function feed(userId: number) {
  return { userId, items: await db.latestPostsByAuthor(userId, 10) };
}

export async function cachedPost(id: number) {
  const key = `post:${id}`;
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  const post = await db.getPostById(id);
  if (!post) return null;
  await redis.set(key, JSON.stringify(post), "EX", 60);
  return post;
}

export const bulk = (b: { items: BulkItem[] }) => summarizeBulk(b.items);

export async function login(b: { email: string; password: string }) {
  const user = await db.findUserForLogin(b.email);
  if (!user || !(await verifyPassword(b.password, user.passwordHash))) return null;
  return { token: await signToken(user.id), user: { id: user.id, email: user.email, name: user.name } };
}
