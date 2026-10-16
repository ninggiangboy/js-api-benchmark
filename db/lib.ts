import { sql } from "../shared/db.js";
import { hashPassword } from "../shared/auth.js";

export const USER_COUNT = 10_000;
export const POST_COUNT = 100_000;

export async function seed() {
  const hash = await hashPassword("password123");
  await sql`TRUNCATE posts, users RESTART IDENTITY CASCADE`;
  await sql`INSERT INTO users (email, name, password_hash)
            SELECT 'user' || g || '@example.com', 'User ' || g, ${hash} FROM generate_series(1, ${USER_COUNT}::int) g`;
  await sql`INSERT INTO posts (author_id, title, body, created_at)
            SELECT (g % ${USER_COUNT}::int) + 1, 'Post title ' || g,
                   repeat('Lorem ipsum dolor sit amet, consectetur adipiscing elit. ', 12),
                   now() - (g || ' seconds')::interval
            FROM generate_series(1, ${POST_COUNT}::int) g`;
  await sql`ANALYZE users`;
  await sql`ANALYZE posts`;
}

/** Undo what write scenarios did, so table size and contents stay stable between runs. */
export async function resetWrites() {
  await sql`DELETE FROM users WHERE id > ${USER_COUNT}::int`;
  await sql`UPDATE users SET name = 'User ' || id WHERE id <= ${USER_COUNT}::int AND name <> 'User ' || id`;
}

export async function counts() {
  const [u] = await sql`SELECT count(*)::int AS n FROM users`;
  const [p] = await sql`SELECT count(*)::int AS n FROM posts`;
  return { users: u.n as number, posts: p.n as number };
}
