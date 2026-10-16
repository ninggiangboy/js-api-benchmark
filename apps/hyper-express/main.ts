import HyperExpress, { type MiddlewareNext, type Request, type Response } from "hyper-express";
import { randomUUID } from "node:crypto";
import type { ZodType } from "zod";
import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";
import { bulkBody, createUserBody, idParam, listPostsQuery, loginBody, patchUserBody } from "../../shared/schemas.js";

const app = new HyperExpress.Server({ max_body_length: 1024 * 1024 });

const invalid = (res: Response) => res.status(400).json({ error: "validation" });
const notFound = (res: Response) => res.status(404).json({ error: "not_found" });
const parse = <T>(schema: ZodType<T>, value: unknown): T | undefined => {
  const r = schema.safeParse(value);
  return r.success ? r.data : undefined;
};
const body = async (req: Request) => { try { return await req.json(); } catch { return undefined; } };

app.set_error_handler((_req, res, err) => {
  logger.error(err);
  if (!res.completed) res.status(500).json({ error: "internal" });
});

app.get("/health", (_req, res) => { res.type("text").send("ok"); });
app.get("/plaintext", (_req, res) => { res.type("text").send("Hello, World!"); });
app.get("/json", (_req, res) => { res.json({ message: "Hello, World!" }); });
app.get("/large-json", (_req, res) => { res.json(svc.buildLargePayload()); });

app.get("/users/:id", async (req, res) => {
  const id = parse(idParam, req.path_parameters.id);
  if (id === undefined) return invalid(res);
  const user = await svc.getUser(id);
  user ? res.json(user) : notFound(res);
});
app.post("/users", async (req, res) => {
  const b = parse(createUserBody, await body(req));
  if (!b) return invalid(res);
  res.status(201).json(await svc.createUser(b));
});
app.patch("/users/:id", async (req, res) => {
  const id = parse(idParam, req.path_parameters.id);
  const b = parse(patchUserBody, await body(req));
  if (id === undefined || !b) return invalid(res);
  const user = await svc.patchUser(id, b.name);
  user ? res.json(user) : notFound(res);
});
app.get("/posts", async (req, res) => {
  const q = parse(listPostsQuery, req.query_parameters);
  if (!q) return invalid(res);
  res.json(await svc.listPosts(q));
});
app.get("/cache/posts/:id", async (req, res) => {
  const id = parse(idParam, req.path_parameters.id);
  if (id === undefined) return invalid(res);
  const post = await svc.cachedPost(id);
  post ? res.json(post) : notFound(res);
});
app.post("/bulk", async (req, res) => {
  const b = parse(bulkBody, await body(req));
  b ? res.json(svc.bulk(b)) : invalid(res);
});
app.post("/auth/login", async (req, res) => {
  const b = parse(loginBody, await body(req));
  if (!b) return invalid(res);
  const result = await svc.login(b);
  result ? res.json(result) : res.status(401).json({ error: "unauthorized" });
});

// /me/feed: request id -> logger -> CORS -> JWT
const requestId = (req: Request, res: Response, next: MiddlewareNext) => {
  const id = req.headers["x-request-id"] ?? randomUUID();
  res.locals.reqId = id;
  res.header("x-request-id", id);
  next();
};
const requestLogger = (req: Request, res: Response, next: MiddlewareNext) => {
  const started = performance.now();
  res.on("finish", () => logger.info({ reqId: res.locals.reqId, method: req.method, url: req.url, status: res.statusCode, ms: performance.now() - started }));
  next();
};
const corsHeaders = (_req: Request, res: Response, next: MiddlewareNext) => {
  res.header("access-control-allow-origin", "*");
  res.header("vary", "Origin");
  next();
};
const jwtAuth = async (req: Request, res: Response) => {
  const userId = await svc.authenticate(req.headers["authorization"]);
  if (userId === null) return res.status(401).json({ error: "unauthorized" });
  res.locals.userId = userId;
};
app.get("/me/feed", { middlewares: [requestId, requestLogger, corsHeaders, jwtAuth] }, async (_req, res) => {
  res.json(await svc.feed(res.locals.userId));
});

app.set_not_found_handler((_req, res) => notFound(res));

await app.listen(config.port, HOST);
console.log(`hyper-express listening on ${config.port}`);
