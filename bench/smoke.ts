import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { signToken } from "../shared/auth.js";
import { resetWrites } from "../db/lib.js";
import { sql } from "../shared/db.js";
import { redis } from "../shared/redis.js";
import { selectCombos } from "./matrix.js";
import { BASE, ROOT, startServer } from "./proc.js";

type Check = [name: string, fn: () => Promise<void>];

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const j = (path: string, init?: RequestInit) => fetch(BASE + path, init);
const jsonInit = (method: string, body: unknown, headers: Record<string, string> = {}): RequestInit =>
  ({ method, headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body) });

export async function runSmoke(): Promise<string[]> {
  const token = await signToken(1);
  const checks: Check[] = [
    ["GET /plaintext", async () => {
      const r = await j("/plaintext");
      assert(r.status === 200, `status ${r.status}`);
      assert((await r.text()) === "Hello, World!", "body");
      assert(r.headers.get("content-type")?.startsWith("text/plain"), `content-type ${r.headers.get("content-type")}`);
    }],
    ["GET /json", async () => {
      const r = await j("/json");
      assert(r.status === 200 && r.headers.get("content-type")?.includes("application/json"), `status/type ${r.status}`);
      assert((await r.json()).message === "Hello, World!", "body");
    }],
    ["GET /users/:id", async () => {
      const r = await j("/users/5");
      assert(r.status === 200, `status ${r.status}`);
      const u = await r.json();
      assert(u.id === 5 && u.email === "user5@example.com" && u.name === "User 5" && u.createdAt, JSON.stringify(u));
      assert((await j("/users/99999999")).status === 404, "missing user should be 404");
      assert((await j("/users/abc")).status === 400, "bad id should be 400");
    }],
    ["GET /posts", async () => {
      const r = await j("/posts?limit=5&offset=2");
      assert(r.status === 200, `status ${r.status}`);
      const b = await r.json();
      assert(b.items.length === 5 && b.limit === 5 && b.offset === 2, "shape");
      assert(b.items.every((p: any) => p.id && p.title && p.author?.name), "post fields");
      const f = await (await j("/posts?authorId=3&limit=100")).json();
      assert(f.items.length === 10 && f.items.every((p: any) => p.author.id === 3), "authorId filter");
      assert((await j("/posts?limit=0")).status === 400, "limit=0 should be 400");
      assert((await j("/posts?limit=abc")).status === 400, "limit=abc should be 400");
      const d = await (await j("/posts")).json();
      assert(d.items.length === 20, "default limit 20");
    }],
    ["POST /users", async () => {
      const r = await j("/users", jsonInit("POST", { email: "smoke@example.com", name: "Smoke" }));
      assert(r.status === 201, `status ${r.status}`);
      const u = await r.json();
      assert(u.id > 0 && u.email === "smoke@example.com" && u.name === "Smoke", JSON.stringify(u));
      assert((await j("/users", jsonInit("POST", { email: "nope", name: "x" }))).status === 400, "bad email should be 400");
      assert((await j("/users", jsonInit("POST", { email: "a@b.co" }))).status === 400, "missing name should be 400");
    }],
    ["PATCH /users/:id", async () => {
      const r = await j("/users/7", jsonInit("PATCH", { name: "Renamed" }));
      assert(r.status === 200, `status ${r.status}`);
      assert((await r.json()).name === "Renamed", "name not updated");
      assert((await j("/users/7", jsonInit("PATCH", { name: "" }))).status === 400, "empty name should be 400");
      assert((await j("/users/99999999", jsonInit("PATCH", { name: "x" }))).status === 404, "missing should be 404");
    }],
    ["GET /me/feed", async () => {
      assert((await j("/me/feed")).status === 401, "no token should be 401");
      assert((await j("/me/feed", { headers: { authorization: "Bearer garbage" } })).status === 401, "bad token should be 401");
      const r = await j("/me/feed", { headers: { authorization: `Bearer ${token}`, "x-request-id": "abc-123", origin: "http://example.com" } });
      assert(r.status === 200, `status ${r.status}`);
      assert(r.headers.get("x-request-id") === "abc-123", "x-request-id not echoed");
      assert(r.headers.get("access-control-allow-origin"), "missing CORS header");
      const b = await r.json();
      assert(b.userId === 1 && b.items.length === 10, "feed shape");
    }],
    ["GET /cache/posts/:id", async () => {
      await redis.del("post:12");
      const miss = await j("/cache/posts/12");
      assert(miss.status === 200, `status ${miss.status}`);
      assert((await redis.exists("post:12")) === 1, "miss did not populate redis");
      const hit = await (await j("/cache/posts/12")).json();
      assert(hit.id === 12 && hit.author?.name && hit.body, "hit shape");
      assert((await j("/cache/posts/99999999")).status === 404, "missing post should be 404");
    }],
    ["GET /large-json", async () => {
      const r = await j("/large-json");
      assert(r.status === 200, `status ${r.status}`);
      const text = await r.text();
      assert(text.length > 80_000, `payload only ${text.length} bytes`);
      assert(JSON.parse(text).count === 500, "count");
    }],
    ["POST /bulk", async () => {
      const items = Array.from({ length: 300 }, (_, i) => ({ id: i, value: i * 2, label: "x".repeat(300) }));
      const r = await j("/bulk", jsonInit("POST", { items }));
      assert(r.status === 200, `status ${r.status}`);
      const b = await r.json();
      assert(b.count === 300 && b.sum === 89700, JSON.stringify(b));
      assert((await j("/bulk", jsonInit("POST", { items: "nope" }))).status === 400, "bad body should be 400");
    }],
    ["POST /auth/login", async () => {
      const r = await j("/auth/login", jsonInit("POST", { email: "user1@example.com", password: "password123" }));
      assert(r.status === 200, `status ${r.status}`);
      const b = await r.json();
      assert(typeof b.token === "string" && b.user.id === 1, "login shape");
      assert((await j("/auth/login", jsonInit("POST", { email: "user1@example.com", password: "wrong" }))).status === 401, "wrong password should be 401");
      assert((await j("/auth/login", jsonInit("POST", { email: "bad" }))).status === 400, "bad body should be 400");
    }],
  ];

  const failures: string[] = [];
  for (const [name, fn] of checks) {
    try { await fn(); } catch (e) { failures.push(`${name}: ${(e as Error).message}`); }
  }
  return failures;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const selected = selectCombos({ only: arg("only"), runtime: arg("runtime") });
  const supported: Record<string, { ok: boolean; reason?: string }> = {};
  for (const combo of selected) {
    process.stdout.write(`${combo.id.padEnd(24)}`);
    try {
      const server = await startServer(combo);
      const failures = await runSmoke();
      await server.stop();
      await resetWrites();
      supported[combo.id] = failures.length ? { ok: false, reason: failures.join("; ") } : { ok: true };
      console.log(failures.length ? `FAIL\n  - ${failures.join("\n  - ")}` : `ok (${server.startupMs}ms startup)`);
    } catch (e) {
      supported[combo.id] = { ok: false, reason: (e as Error).message };
      console.log(`N/A  ${(e as Error).message}`);
    }
  }
  mkdirSync(resolve(ROOT, "results"), { recursive: true });
  const file = resolve(ROOT, "results", "supported.json");
  let prev: typeof supported = {};
  try { prev = JSON.parse((await import("node:fs")).readFileSync(file, "utf8")); } catch { /* first run */ }
  writeFileSync(file, JSON.stringify({ ...prev, ...supported }, null, 2));
  await sql.end(); redis.disconnect();
}
