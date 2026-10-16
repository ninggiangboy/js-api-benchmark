import { H3, HTTPError, defineMiddleware, getValidatedQuery, getValidatedRouterParams, handleCors, readValidatedBody, serve } from "h3";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";
import { bulkBody, createUserBody, idParam, listPostsQuery, loginBody, patchUserBody } from "../../shared/schemas.js";

const idParams = z.object({ id: idParam });
const notFound = () => new HTTPError({ status: 404, data: { error: "not_found" } });

const text = (body: string) => new Response(body, { headers: { "content-type": "text/plain" } });

const app = new H3({
  onError: (err) => {
    const status = err.status && err.status < 500 ? err.status : 500;
    if (status === 500) logger.error(err);
    return Response.json({ error: status === 500 ? "internal" : status === 404 ? "not_found" : status === 401 ? "unauthorized" : "validation" }, { status });
  },
});

app.get("/health", () => text("ok"));
app.get("/plaintext", () => text("Hello, World!"));
app.get("/json", () => ({ message: "Hello, World!" }));
app.get("/large-json", () => svc.buildLargePayload());

app.get("/users/:id", async (event) => {
  const { id } = await getValidatedRouterParams(event, idParams);
  const user = await svc.getUser(id);
  if (!user) throw notFound();
  return user;
});
app.post("/users", async (event) => {
  const body = await readValidatedBody(event, createUserBody);
  event.res.status = 201;
  return svc.createUser(body);
});
app.patch("/users/:id", async (event) => {
  const { id } = await getValidatedRouterParams(event, idParams);
  const body = await readValidatedBody(event, patchUserBody);
  const user = await svc.patchUser(id, body.name);
  if (!user) throw notFound();
  return user;
});
app.get("/posts", async (event) => svc.listPosts(await getValidatedQuery(event, listPostsQuery)));
app.get("/cache/posts/:id", async (event) => {
  const { id } = await getValidatedRouterParams(event, idParams);
  const post = await svc.cachedPost(id);
  if (!post) throw notFound();
  return post;
});
app.post("/bulk", async (event) => svc.bulk(await readValidatedBody(event, bulkBody)));
app.post("/auth/login", async (event) => {
  const result = await svc.login(await readValidatedBody(event, loginBody));
  if (!result) throw new HTTPError({ status: 401, data: { error: "unauthorized" } });
  return result;
});

// /me/feed: request id -> logger -> CORS -> JWT
const requestId = defineMiddleware(async (event, next) => {
  const id = event.req.headers.get("x-request-id") ?? randomUUID();
  event.context.reqId = id;
  event.res.headers.set("x-request-id", id);
  return next();
});
const requestLogger = defineMiddleware(async (event, next) => {
  const started = performance.now();
  try { return await next(); } finally {
    logger.info({ reqId: event.context.reqId, method: event.req.method, url: event.url.pathname, ms: performance.now() - started });
  }
});
const corsMiddleware = defineMiddleware((event, next) => {
  const res = handleCors(event, { origin: "*" });
  return res === false ? next() : res;
});
const jwtAuth = defineMiddleware(async (event, next) => {
  const userId = await svc.authenticate(event.req.headers.get("authorization"));
  if (userId === null) throw new HTTPError({ status: 401, data: { error: "unauthorized" } });
  event.context.userId = userId;
  return next();
});
app.get("/me/feed", (event) => svc.feed(event.context.userId as number), {
  middleware: [requestId, requestLogger, corsMiddleware, jwtAuth],
});

serve(app, { port: config.port, hostname: HOST, silent: true });
console.log(`h3 listening on ${config.port}`);
