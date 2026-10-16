import postgres from "postgres";
import { config } from "./config.js";

export const sql = postgres(config.databaseUrl, { max: config.dbPoolSize, prepare: true });

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
}

export async function getUserById(id: number): Promise<User | null> {
  const rows = await sql<User[]>`
    SELECT id, email, name, created_at AS "createdAt" FROM users WHERE id = ${id}`;
  return rows[0] ?? null;
}

export async function findUserForLogin(email: string) {
  const rows = await sql<{ id: number; email: string; name: string; passwordHash: string }[]>`
    SELECT id, email, name, password_hash AS "passwordHash" FROM users WHERE email = ${email}`;
  return rows[0] ?? null;
}

export async function listPosts(limit: number, offset: number, authorId?: number) {
  return sql`
    SELECT p.id, p.title, p.created_at AS "createdAt",
           json_build_object('id', u.id, 'name', u.name) AS author
    FROM posts p JOIN users u ON u.id = p.author_id
    WHERE (${authorId ?? null}::int IS NULL OR p.author_id = ${authorId ?? null}::int)
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${limit} OFFSET ${offset}`;
}

export async function upsertUser(email: string, name: string, passwordHash: string): Promise<User> {
  const rows = await sql<User[]>`
    INSERT INTO users (email, name, password_hash) VALUES (${email}, ${name}, ${passwordHash})
    ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name
    RETURNING id, email, name, created_at AS "createdAt"`;
  return rows[0];
}

export async function patchUser(id: number, name?: string): Promise<User | null> {
  const rows = await sql<User[]>`
    UPDATE users SET name = COALESCE(${name ?? null}, name) WHERE id = ${id}
    RETURNING id, email, name, created_at AS "createdAt"`;
  return rows[0] ?? null;
}

export async function latestPostsByAuthor(authorId: number, limit: number) {
  return sql`
    SELECT id, title, created_at AS "createdAt" FROM posts
    WHERE author_id = ${authorId} ORDER BY created_at DESC, id DESC LIMIT ${limit}`;
}

export async function getPostById(id: number) {
  const rows = await sql`
    SELECT p.id, p.title, p.body, p.created_at AS "createdAt",
           json_build_object('id', u.id, 'name', u.name) AS author
    FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ${id}`;
  return rows[0] ?? null;
}
