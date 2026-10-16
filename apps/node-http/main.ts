import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { config } from "../../shared/config.js";
import * as svc from "../../shared/service.js";
import { bulkBody, createUserBody, listPostsQuery, loginBody, patchUserBody, parseId } from "../../shared/schemas.js";
import { logger } from "../../shared/logger.js";
import { randomUUID } from "node:crypto";

function send(res: ServerResponse, status: number, body: unknown, headers: Record<string, string> = {}) {
  const isText = typeof body === "string";
  const payload = isText ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": isText ? "text/plain" : "application/json", "content-length": Buffer.byteLength(payload), ...headers });
  res.end(payload);
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  try { return JSON.parse(Buffer.concat(chunks).toString() || "null"); } catch { return undefined; }
}

const invalid = (res: ServerResponse) => send(res, 400, { error: "validation" });
const notFound = (res: ServerResponse) => send(res, 404, { error: "not_found" });

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url!, "http://x");
  const parts = url.pathname.split("/").filter(Boolean);
  const m = req.method;

  if (m === "GET" && url.pathname === "/health") return send(res, 200, "ok");
  if (m === "GET" && url.pathname === "/plaintext") return send(res, 200, "Hello, World!");
  if (m === "GET" && url.pathname === "/json") return send(res, 200, { message: "Hello, World!" });
  if (m === "GET" && url.pathname === "/large-json") return send(res, 200, svc.buildLargePayload());

  if (parts[0] === "users" && parts.length === 2) {
    const id = parseId(parts[1]);
    if (id === null) return invalid(res);
    if (m === "GET") { const u = await svc.getUser(id); return u ? send(res, 200, u) : notFound(res); }
    if (m === "PATCH") {
      const b = patchUserBody.safeParse(await readJson(req));
      if (!b.success) return invalid(res);
      const u = await svc.patchUser(id, b.data.name);
      return u ? send(res, 200, u) : notFound(res);
    }
  }
  if (m === "POST" && url.pathname === "/users") {
    const b = createUserBody.safeParse(await readJson(req));
    if (!b.success) return invalid(res);
    return send(res, 201, await svc.createUser(b.data));
  }
  if (m === "GET" && url.pathname === "/posts") {
    const q = listPostsQuery.safeParse(Object.fromEntries(url.searchParams));
    if (!q.success) return invalid(res);
    return send(res, 200, await svc.listPosts(q.data));
  }
  if (m === "GET" && parts[0] === "cache" && parts[1] === "posts" && parts.length === 3) {
    const id = parseId(parts[2]);
    if (id === null) return invalid(res);
    const p = await svc.cachedPost(id);
    return p ? send(res, 200, p) : notFound(res);
  }
  if (m === "POST" && url.pathname === "/bulk") {
    const b = bulkBody.safeParse(await readJson(req));
    return b.success ? send(res, 200, svc.bulk(b.data)) : invalid(res);
  }
  if (m === "POST" && url.pathname === "/auth/login") {
    const b = loginBody.safeParse(await readJson(req));
    if (!b.success) return invalid(res);
    const r = await svc.login(b.data);
    return r ? send(res, 200, r) : send(res, 401, { error: "unauthorized" });
  }
  if (m === "GET" && url.pathname === "/me/feed") {
    // middleware stack: request id -> logger -> CORS -> JWT
    const reqId = (req.headers["x-request-id"] as string) ?? randomUUID();
    const started = performance.now();
    res.on("finish", () => logger.info({ reqId, method: m, url: req.url, status: res.statusCode, ms: performance.now() - started }));
    const cors = { "x-request-id": reqId, "access-control-allow-origin": "*", vary: "Origin" };
    const userId = await svc.authenticate(req.headers.authorization);
    if (userId === null) return send(res, 401, { error: "unauthorized" }, cors);
    return send(res, 200, await svc.feed(userId), cors);
  }
  notFound(res);
}

createServer((req, res) => {
  handle(req, res).catch((err) => { logger.error(err); if (!res.headersSent) send(res, 500, { error: "internal" }); });
}).listen(config.port, "127.0.0.1", () => console.log(`node-http listening on ${config.port}`));
