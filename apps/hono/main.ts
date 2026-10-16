import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger as honoLogger } from "hono/logger";
import { requestId } from "hono/request-id";
import { createMiddleware } from "hono/factory";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { config } from "../../shared/config.js";
import { HOST, runtime } from "../../shared/runtime.js";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";
import { bulkBody, createUserBody, idParam, listPostsQuery, loginBody, patchUserBody } from "../../shared/schemas.js";

type Env = { Variables: { userId: number; requestId: string } };
const app = new Hono<Env>();
const idParams = z.object({ id: idParam });
const invalid = (result: { success: boolean }, c: { json: (b: unknown, s: 400) => Response }) =>
  result.success ? undefined : c.json({ error: "validation" }, 400);

app.onError((err, c) => {
  logger.error(err);
  return c.json({ error: "internal" }, 500);
});
app.notFound((c) => c.json({ error: "not_found" }, 404));

app.get("/health", (c) => c.text("ok"));
app.get("/plaintext", (c) => c.text("Hello, World!"));
app.get("/json", (c) => c.json({ message: "Hello, World!" }));
app.get("/large-json", (c) => c.json(svc.buildLargePayload()));

app.get("/users/:id", zValidator("param", idParams, invalid), async (c) => {
  const user = await svc.getUser(c.req.valid("param").id);
  return user ? c.json(user) : c.json({ error: "not_found" }, 404);
});
app.post("/users", zValidator("json", createUserBody, invalid), async (c) =>
  c.json(await svc.createUser(c.req.valid("json")), 201));
app.patch("/users/:id", zValidator("param", idParams, invalid), zValidator("json", patchUserBody, invalid), async (c) => {
  const user = await svc.patchUser(c.req.valid("param").id, c.req.valid("json").name);
  return user ? c.json(user) : c.json({ error: "not_found" }, 404);
});
app.get("/posts", zValidator("query", listPostsQuery, invalid), async (c) =>
  c.json(await svc.listPosts(c.req.valid("query"))));
app.get("/cache/posts/:id", zValidator("param", idParams, invalid), async (c) => {
  const post = await svc.cachedPost(c.req.valid("param").id);
  return post ? c.json(post) : c.json({ error: "not_found" }, 404);
});
app.post("/bulk", zValidator("json", bulkBody, invalid), (c) => c.json(svc.bulk(c.req.valid("json"))));
app.post("/auth/login", zValidator("json", loginBody, invalid), async (c) => {
  const result = await svc.login(c.req.valid("json"));
  return result ? c.json(result) : c.json({ error: "unauthorized" }, 401);
});

// /me/feed: request id -> logger -> CORS -> JWT
const jwtAuth = createMiddleware<Env>(async (c, next) => {
  const userId = await svc.authenticate(c.req.header("authorization"));
  if (userId === null) return c.json({ error: "unauthorized" }, 401);
  c.set("userId", userId);
  await next();
});
app.use("/me/*", requestId(), honoLogger((line) => logger.info(line)), cors(), jwtAuth);
app.get("/me/feed", async (c) => c.json(await svc.feed(c.get("userId"))));

const common = { port: config.port, hostname: HOST };
const g = globalThis as any;
if (runtime === "bun") g.Bun.serve({ ...common, fetch: app.fetch });
else if (runtime === "deno") g.Deno.serve({ ...common, onListen() {} }, app.fetch);
else (await import("@hono/node-server")).serve({ ...common, fetch: app.fetch });
console.log(`hono listening on ${config.port}`);
