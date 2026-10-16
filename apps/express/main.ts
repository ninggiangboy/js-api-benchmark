import express, { type NextFunction, type Request, type Response } from "express";
import cors from "cors";
import { randomUUID } from "node:crypto";
import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";
import { bulkBody, createUserBody, idParam, listPostsQuery, loginBody, patchUserBody } from "../../shared/schemas.js";
import type { ZodType } from "zod";

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

const parse = <T>(schema: ZodType<T>, value: unknown, res: Response): T | undefined => {
  const r = schema.safeParse(value);
  if (!r.success) { res.status(400).json({ error: "validation" }); return undefined; }
  return r.data;
};

app.get("/health", (_req, res) => { res.send("ok"); });
app.get("/plaintext", (_req, res) => { res.type("text/plain").send("Hello, World!"); });
app.get("/json", (_req, res) => { res.json({ message: "Hello, World!" }); });
app.get("/large-json", (_req, res) => { res.json(svc.buildLargePayload()); });

app.get("/users/:id", async (req, res) => {
  const id = parse(idParam, req.params.id, res); if (id === undefined) return;
  const user = await svc.getUser(id);
  user ? res.json(user) : res.status(404).json({ error: "not_found" });
});

app.post("/users", async (req, res) => {
  const body = parse(createUserBody, req.body, res); if (!body) return;
  res.status(201).json(await svc.createUser(body));
});

app.patch("/users/:id", async (req, res) => {
  const id = parse(idParam, req.params.id, res); if (id === undefined) return;
  const body = parse(patchUserBody, req.body, res); if (!body) return;
  const user = await svc.patchUser(id, body.name);
  user ? res.json(user) : res.status(404).json({ error: "not_found" });
});

app.get("/posts", async (req, res) => {
  const q = parse(listPostsQuery, req.query, res); if (!q) return;
  res.json(await svc.listPosts(q));
});

app.get("/cache/posts/:id", async (req, res) => {
  const id = parse(idParam, req.params.id, res); if (id === undefined) return;
  const post = await svc.cachedPost(id);
  post ? res.json(post) : res.status(404).json({ error: "not_found" });
});

app.post("/bulk", (req, res) => {
  const body = parse(bulkBody, req.body, res); if (!body) return;
  res.json(svc.bulk(body));
});

app.post("/auth/login", async (req, res) => {
  const body = parse(loginBody, req.body, res); if (!body) return;
  const result = await svc.login(body);
  result ? res.json(result) : res.status(401).json({ error: "unauthorized" });
});

// /me/feed: request id -> logger -> CORS -> JWT
const requestId = (req: Request, res: Response, next: NextFunction) => {
  const id = req.header("x-request-id") ?? randomUUID();
  res.locals.reqId = id;
  res.setHeader("x-request-id", id);
  next();
};
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const started = performance.now();
  res.on("finish", () => logger.info({ reqId: res.locals.reqId, method: req.method, url: req.originalUrl, status: res.statusCode, ms: performance.now() - started }));
  next();
};
const jwtAuth = async (req: Request, res: Response, next: NextFunction) => {
  const userId = await svc.authenticate(req.header("authorization"));
  if (userId === null) { res.status(401).json({ error: "unauthorized" }); return; }
  res.locals.userId = userId;
  next();
};

app.get("/me/feed", requestId, requestLogger, cors(), jwtAuth, async (_req, res) => {
  res.json(await svc.feed(res.locals.userId));
});

app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status && err.status < 500 ? err.status : 500;
  if (status === 500) logger.error(err);
  res.status(status).json({ error: status === 500 ? "internal" : "validation" });
});

app.listen(config.port, HOST, () => console.log(`express listening on ${config.port}`));
