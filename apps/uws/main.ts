import { createRequire } from "node:module";
import type * as uWS from "uWebSockets.js";
import { randomUUID } from "node:crypto";
import type { ZodType } from "zod";
import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";
import { bulkBody, createUserBody, listPostsQuery, loginBody, patchUserBody, parseId } from "../../shared/schemas.js";

interface Ctx {
  params: string[];
  query: string;
  authorization: string;
  requestId: string;
  body: Promise<unknown>;
}
interface Reply { status: number; body: string; type: string; headers?: Record<string, string> }

const STATUS: Record<number, string> = { 200: "200 OK", 201: "201 Created", 400: "400 Bad Request", 401: "401 Unauthorized", 404: "404 Not Found", 500: "500 Internal Server Error" };
const json = (status: number, body: unknown, headers?: Record<string, string>): Reply =>
  ({ status, body: JSON.stringify(body), type: "application/json", headers });
const text = (body: string): Reply => ({ status: 200, body, type: "text/plain" });
const invalid = () => json(400, { error: "validation" });
const notFound = () => json(404, { error: "not_found" });

const readBody = (res: uWS.HttpResponse): Promise<unknown> =>
  new Promise((resolve) => {
    const chunks: Buffer[] = [];
    res.onData((chunk, isLast) => {
      chunks.push(Buffer.from(chunk.slice(0)));
      if (!isLast) return;
      try { resolve(JSON.parse(Buffer.concat(chunks).toString() || "null")); } catch { resolve(undefined); }
    });
  });

function parse<T>(schema: ZodType<T>, value: unknown): T | undefined {
  const r = schema.safeParse(value);
  return r.success ? r.data : undefined;
}

const wrap = (needsBody: boolean, nParams: number, fn: (c: Ctx) => Reply | Promise<Reply>) =>
  (res: uWS.HttpResponse, req: uWS.HttpRequest) => {
    let aborted = false;
    res.onAborted(() => { aborted = true; });
    // uWS invalidates `req` after the first await, so copy everything we need up front.
    const params: string[] = [];
    for (let i = 0; i < nParams; i++) params.push(req.getParameter(i) ?? "");
    const ctx: Ctx = {
      params, query: req.getQuery() ?? "", authorization: req.getHeader("authorization"),
      requestId: req.getHeader("x-request-id"),
      body: needsBody ? readBody(res) : Promise.resolve(undefined),
    };
    Promise.resolve().then(() => fn(ctx)).catch((err): Reply => { logger.error(err); return json(500, { error: "internal" }); })
      .then((reply) => {
        if (aborted) return;
        res.cork(() => {
          res.writeStatus(STATUS[reply.status]).writeHeader("content-type", reply.type);
          if (reply.headers) for (const k in reply.headers) res.writeHeader(k, reply.headers[k]);
          res.end(reply.body);
        });
      });
  };

// The package ships a broken ESM wrapper, so load the CJS entry directly.
const uws = createRequire(import.meta.url)("uWebSockets.js") as typeof uWS;
const app = uws.App();

app.get("/health", wrap(false, 0, () => text("ok")));
app.get("/plaintext", wrap(false, 0, () => text("Hello, World!")));
app.get("/json", wrap(false, 0, () => json(200, { message: "Hello, World!" })));
app.get("/large-json", wrap(false, 0, () => json(200, svc.buildLargePayload())));

app.get("/users/:id", wrap(false, 1, async (c) => {
  const id = parseId(c.params[0]);
  if (id === null) return invalid();
  const user = await svc.getUser(id);
  return user ? json(200, user) : notFound();
}));
app.post("/users", wrap(true, 0, async (c) => {
  const b = parse(createUserBody, await c.body);
  return b ? json(201, await svc.createUser(b)) : invalid();
}));
app.patch("/users/:id", wrap(true, 1, async (c) => {
  const id = parseId(c.params[0]);
  const b = parse(patchUserBody, await c.body);
  if (id === null || !b) return invalid();
  const user = await svc.patchUser(id, b.name);
  return user ? json(200, user) : notFound();
}));
app.get("/posts", wrap(false, 0, async (c) => {
  const q = parse(listPostsQuery, Object.fromEntries(new URLSearchParams(c.query)));
  return q ? json(200, await svc.listPosts(q)) : invalid();
}));
app.get("/cache/posts/:id", wrap(false, 1, async (c) => {
  const id = parseId(c.params[0]);
  if (id === null) return invalid();
  const post = await svc.cachedPost(id);
  return post ? json(200, post) : notFound();
}));
app.post("/bulk", wrap(true, 0, async (c) => {
  const b = parse(bulkBody, await c.body);
  return b ? json(200, svc.bulk(b)) : invalid();
}));
app.post("/auth/login", wrap(true, 0, async (c) => {
  const b = parse(loginBody, await c.body);
  if (!b) return invalid();
  const result = await svc.login(b);
  return result ? json(200, result) : json(401, { error: "unauthorized" });
}));

// /me/feed: request id -> logger -> CORS -> JWT
app.get("/me/feed", wrap(false, 0, async (c) => {
  const started = performance.now();
  const reqId = c.requestId || randomUUID();
  const headers = { "x-request-id": reqId, "access-control-allow-origin": "*", vary: "Origin" };
  const userId = await svc.authenticate(c.authorization);
  const reply = userId === null ? json(401, { error: "unauthorized" }, headers) : json(200, await svc.feed(userId), headers);
  logger.info({ reqId, method: "GET", url: "/me/feed", status: reply.status, ms: performance.now() - started });
  return reply;
}));

app.any("/*", wrap(false, 0, () => notFound()));

app.listen(HOST, config.port, (token) => {
  if (!token) { console.error(`uws failed to listen on ${config.port}`); process.exit(1); }
  console.log(`uws listening on ${config.port}`);
});
