import type { Fixtures } from "./fixtures.js";
import { BASE } from "./proc.js";

export interface Scenario {
  id: string;
  label: string;
  group: "baseline" | "database" | "middleware" | "cache" | "cpu" | "mixed";
  kind: "oha" | "k6";
  method?: string;
  /** URL, or a regex when `randomUrl` is set (oha --rand-regex-url). */
  url?: string;
  randomUrl?: boolean;
  headers?: string[];
  body?: { file: string; perLine?: boolean };
  connections?: number;
  /** The scenario mutates Postgres; the runner restores it before and after. */
  writes?: boolean;
  flushRedis?: boolean;
}

const JSON_H = "content-type: application/json";

export function buildScenarios(fx: Fixtures): Scenario[] {
  return [
    { id: "plaintext", label: "GET /plaintext", group: "baseline", kind: "oha", method: "GET", url: `${BASE}/plaintext`, connections: 64 },
    { id: "json", label: "GET /json", group: "baseline", kind: "oha", method: "GET", url: `${BASE}/json`, connections: 64 },
    { id: "json-c256", label: "GET /json (256 conns)", group: "baseline", kind: "oha", method: "GET", url: `${BASE}/json`, connections: 256 },
    { id: "user-get", label: "GET /users/:id (Postgres PK lookup)", group: "database", kind: "oha", method: "GET", url: `${BASE}/users/[1-9][0-9]{0,3}`, randomUrl: true, connections: 64 },
    { id: "posts-list", label: "GET /posts (JOIN + pagination)", group: "database", kind: "oha", method: "GET", url: `${BASE}/posts\\?limit=20&offset=[0-9]{1,3}`, randomUrl: true, connections: 64 },
    { id: "user-create", label: "POST /users (validate + INSERT)", group: "database", kind: "oha", method: "POST", url: `${BASE}/users`, headers: [JSON_H], body: { file: fx.usersNdjson, perLine: true }, connections: 64, writes: true },
    { id: "user-patch", label: "PATCH /users/:id (validate + UPDATE)", group: "database", kind: "oha", method: "PATCH", url: `${BASE}/users/[1-9][0-9]{0,3}`, randomUrl: true, headers: [JSON_H], body: { file: fx.patchJson }, connections: 64, writes: true },
    { id: "feed", label: "GET /me/feed (request-id, logger, CORS, JWT, query)", group: "middleware", kind: "oha", method: "GET", url: `${BASE}/me/feed`, headers: [`authorization: Bearer ${fx.token}`, "origin: http://example.com"], connections: 64 },
    { id: "cache-hit", label: "GET /cache/posts/:id (Redis cache-aside)", group: "cache", kind: "oha", method: "GET", url: `${BASE}/cache/posts/[1-9][0-9]{0,2}`, randomUrl: true, connections: 64, flushRedis: true },
    { id: "large-json", label: "GET /large-json (~100KB serialize)", group: "cpu", kind: "oha", method: "GET", url: `${BASE}/large-json`, connections: 64 },
    { id: "bulk", label: "POST /bulk (parse + validate ~100KB)", group: "cpu", kind: "oha", method: "POST", url: `${BASE}/bulk`, headers: [JSON_H], body: { file: fx.bulkJson }, connections: 64 },
    { id: "login", label: "POST /auth/login (scrypt + JWT sign)", group: "cpu", kind: "oha", method: "POST", url: `${BASE}/auth/login`, headers: [JSON_H], body: { file: fx.loginJson }, connections: 64 },
    { id: "mix", label: "Mixed traffic at fixed rate (k6)", group: "mixed", kind: "k6", writes: true, flushRedis: true },
  ];
}
