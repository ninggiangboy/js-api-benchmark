import { Elysia, t } from "elysia";
import { node } from "@elysiajs/node";
import { randomUUID } from "node:crypto";
import { config } from "../../shared/config.js";
import { HOST, runtime } from "../../shared/runtime.js";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";

const id = t.Numeric({ minimum: 1 });
const idParams = t.Object({ id });
const email = t.String({ format: "email" });

// /me/feed lives in its own plugin: request id -> logger -> CORS -> JWT
const feed = new Elysia()
  .derive(({ request, set }) => {
    const reqId = request.headers.get("x-request-id") ?? randomUUID();
    set.headers["x-request-id"] = reqId;
    set.headers["access-control-allow-origin"] = "*";
    set.headers["vary"] = "Origin";
    return { reqId, started: performance.now() };
  })
  .resolve(async ({ request, status }) => {
    const userId = await svc.authenticate(request.headers.get("authorization"));
    if (userId === null) return status(401, { error: "unauthorized" });
    return { userId };
  })
  .onAfterResponse(({ reqId, started, request, set }) => {
    logger.info({ reqId, method: request.method, url: request.url, status: set.status, ms: performance.now() - started });
  })
  .get("/me/feed", ({ userId }) => svc.feed(userId));

const app = new Elysia(runtime === "node" ? { adapter: node() } : {})
  .onError(({ code, set }) => {
    if (code === "VALIDATION" || code === "PARSE") { set.status = 400; return { error: "validation" }; }
    if (code === "NOT_FOUND") { set.status = 404; return { error: "not_found" }; }
    set.status = 500; return { error: "internal" };
  })
  .get("/health", () => "ok")
  .get("/plaintext", () => "Hello, World!")
  .get("/json", () => ({ message: "Hello, World!" }))
  .get("/large-json", () => svc.buildLargePayload())
  .get("/users/:id", async ({ params, set }) => {
    const user = await svc.getUser(params.id);
    if (!user) { set.status = 404; return { error: "not_found" }; }
    return user;
  }, { params: idParams })
  .post("/users", async ({ body, set }) => {
    set.status = 201;
    return svc.createUser(body);
  }, { body: t.Object({ email, name: t.String({ minLength: 1, maxLength: 100 }) }) })
  .patch("/users/:id", async ({ params, body, set }) => {
    const user = await svc.patchUser(params.id, body.name);
    if (!user) { set.status = 404; return { error: "not_found" }; }
    return user;
  }, { params: idParams, body: t.Object({ name: t.Optional(t.String({ minLength: 1, maxLength: 100 })) }) })
  .get("/posts", ({ query }) => svc.listPosts({ limit: query.limit ?? 20, offset: query.offset ?? 0, authorId: query.authorId }), {
    query: t.Object({
      limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100 })),
      offset: t.Optional(t.Numeric({ minimum: 0 })),
      authorId: t.Optional(t.Numeric({ minimum: 1 })),
    }),
  })
  .get("/cache/posts/:id", async ({ params, set }) => {
    const post = await svc.cachedPost(params.id);
    if (!post) { set.status = 404; return { error: "not_found" }; }
    return post;
  }, { params: idParams })
  .post("/bulk", ({ body }) => svc.bulk(body), {
    body: t.Object({ items: t.Array(t.Object({ id: t.Integer(), value: t.Number(), label: t.String({ maxLength: 500 }) }), { maxItems: 5000 }) }),
  })
  .post("/auth/login", async ({ body, set }) => {
    const result = await svc.login(body);
    if (!result) { set.status = 401; return { error: "unauthorized" }; }
    return result;
  }, { body: t.Object({ email, password: t.String({ minLength: 1, maxLength: 200 }) }) })
  .use(feed);

if (runtime === "deno") (globalThis as any).Deno.serve({ port: config.port, hostname: HOST, onListen() {} }, app.fetch);
else app.listen({ port: config.port, hostname: HOST });
console.log(`elysia listening on ${config.port}`);
