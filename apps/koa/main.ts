import Koa, { type Context, type Next } from "koa";
import Router from "@koa/router";
import bodyParser from "koa-bodyparser";
import cors from "@koa/cors";
import { randomUUID } from "node:crypto";
import type { ZodType } from "zod";
import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";
import { bulkBody, createUserBody, idParam, listPostsQuery, loginBody, patchUserBody } from "../../shared/schemas.js";

class HttpError extends Error { constructor(public status: number, public body: unknown) { super("http"); } }
const bad = () => new HttpError(400, { error: "validation" });
const notFound = () => new HttpError(404, { error: "not_found" });
const parse = <T>(schema: ZodType<T>, value: unknown): T => {
  const r = schema.safeParse(value);
  if (!r.success) throw bad();
  return r.data;
};

const app = new Koa();
app.use(async (ctx, next) => {
  try { await next(); } catch (err) {
    if (err instanceof HttpError) { ctx.status = err.status; ctx.body = err.body; return; }
    const status = (err as { status?: number }).status;
    if (status && status < 500) { ctx.status = status; ctx.body = { error: "validation" }; return; }
    logger.error(err as Error); ctx.status = 500; ctx.body = { error: "internal" };
  }
});
app.use(bodyParser({ jsonLimit: "1mb", enableTypes: ["json"] }));

const router = new Router();
const body = (ctx: Context) => (ctx.request as unknown as { body: unknown }).body;

router.get("/health", (ctx) => { ctx.type = "text/plain"; ctx.body = "ok"; });
router.get("/plaintext", (ctx) => { ctx.type = "text/plain"; ctx.body = "Hello, World!"; });
router.get("/json", (ctx) => { ctx.body = { message: "Hello, World!" }; });
router.get("/large-json", (ctx) => { ctx.body = svc.buildLargePayload(); });

router.get("/users/:id", async (ctx) => {
  const user = await svc.getUser(parse(idParam, ctx.params.id));
  if (!user) throw notFound();
  ctx.body = user;
});
router.post("/users", async (ctx) => {
  ctx.status = 201;
  ctx.body = await svc.createUser(parse(createUserBody, body(ctx)));
});
router.patch("/users/:id", async (ctx) => {
  const id = parse(idParam, ctx.params.id);
  const user = await svc.patchUser(id, parse(patchUserBody, body(ctx)).name);
  if (!user) throw notFound();
  ctx.body = user;
});
router.get("/posts", async (ctx) => { ctx.body = await svc.listPosts(parse(listPostsQuery, ctx.query)); });
router.get("/cache/posts/:id", async (ctx) => {
  const post = await svc.cachedPost(parse(idParam, ctx.params.id));
  if (!post) throw notFound();
  ctx.body = post;
});
router.post("/bulk", (ctx) => { ctx.body = svc.bulk(parse(bulkBody, body(ctx))); });
router.post("/auth/login", async (ctx) => {
  const result = await svc.login(parse(loginBody, body(ctx)));
  if (!result) throw new HttpError(401, { error: "unauthorized" });
  ctx.body = result;
});

// /me/feed: request id -> logger -> CORS -> JWT
const requestId = async (ctx: Context, next: Next) => {
  const id = ctx.get("x-request-id") || randomUUID();
  ctx.state.reqId = id;
  ctx.set("x-request-id", id);
  await next();
};
const requestLogger = async (ctx: Context, next: Next) => {
  const started = performance.now();
  try { await next(); } finally {
    logger.info({ reqId: ctx.state.reqId, method: ctx.method, url: ctx.url, status: ctx.status, ms: performance.now() - started });
  }
};
const jwtAuth = async (ctx: Context, next: Next) => {
  const userId = await svc.authenticate(ctx.get("authorization"));
  if (userId === null) throw new HttpError(401, { error: "unauthorized" });
  ctx.state.userId = userId;
  await next();
};
router.get("/me/feed", requestId, requestLogger, cors(), jwtAuth, async (ctx) => {
  ctx.body = await svc.feed(ctx.state.userId);
});

app.use(router.routes());
app.listen(config.port, HOST, () => console.log(`koa listening on ${config.port}`));
