import Fastify, { type FastifyError } from "fastify";
import cors from "@fastify/cors";
import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";

const app = Fastify({ loggerInstance: logger, disableRequestLogging: true, requestIdHeader: "x-request-id", bodyLimit: 1024 * 1024 });

const idParams = { type: "object", required: ["id"], properties: { id: { type: "integer", minimum: 1 } } } as const;
const userSchema = {
  type: "object",
  properties: { id: { type: "integer" }, email: { type: "string" }, name: { type: "string" }, createdAt: { type: "string", format: "date-time" } },
} as const;
const notFound = { error: "not_found" };
const notFoundSchema = { type: "object", properties: { error: { type: "string" } } } as const;

app.setErrorHandler((err: FastifyError, _req, reply) => {
  const status = err.statusCode && err.statusCode < 500 ? err.statusCode : 500;
  if (status === 500) logger.error(err);
  reply.code(status).send({ error: status === 500 ? "internal" : "validation" });
});

app.get("/health", async (_req, reply) => reply.type("text/plain").send("ok"));
app.get("/plaintext", async (_req, reply) => reply.type("text/plain").send("Hello, World!"));
app.get("/json", {
  schema: { response: { 200: { type: "object", properties: { message: { type: "string" } } } } },
}, async () => ({ message: "Hello, World!" }));
app.get("/large-json", async () => svc.buildLargePayload());

app.get("/users/:id", { schema: { params: idParams, response: { 200: userSchema, 404: notFoundSchema } } }, async (req, reply) => {
  const user = await svc.getUser((req.params as { id: number }).id);
  return user ?? reply.code(404).send(notFound);
});

app.post("/users", {
  schema: {
    body: { type: "object", required: ["email", "name"], properties: { email: { type: "string", format: "email" }, name: { type: "string", minLength: 1, maxLength: 100 } } },
    response: { 201: userSchema },
  },
}, async (req, reply) => reply.code(201).send(await svc.createUser(req.body as { email: string; name: string })));

app.patch("/users/:id", {
  schema: {
    params: idParams,
    body: { type: "object", properties: { name: { type: "string", minLength: 1, maxLength: 100 } } },
    response: { 200: userSchema, 404: notFoundSchema },
  },
}, async (req, reply) => {
  const user = await svc.patchUser((req.params as { id: number }).id, (req.body as { name?: string }).name);
  return user ?? reply.code(404).send(notFound);
});

app.get("/posts", {
  schema: {
    querystring: {
      type: "object",
      properties: {
        limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        offset: { type: "integer", minimum: 0, default: 0 },
        authorId: { type: "integer", minimum: 1 },
      },
    },
  },
}, async (req) => svc.listPosts(req.query as { limit: number; offset: number; authorId?: number }));

app.get("/cache/posts/:id", { schema: { params: idParams, response: { 404: notFoundSchema } } }, async (req, reply) => {
  const post = await svc.cachedPost((req.params as { id: number }).id);
  return post ?? reply.code(404).send(notFound);
});

app.post("/bulk", {
  schema: {
    body: {
      type: "object", required: ["items"],
      properties: { items: { type: "array", maxItems: 5000, items: { type: "object", required: ["id", "value", "label"], properties: { id: { type: "integer" }, value: { type: "number" }, label: { type: "string", maxLength: 500 } } } } },
    },
    response: { 200: { type: "object", properties: { count: { type: "integer" }, sum: { type: "number" } } } },
  },
}, async (req) => svc.bulk(req.body as { items: { id: number; value: number; label: string }[] }));

app.post("/auth/login", {
  schema: { body: { type: "object", required: ["email", "password"], properties: { email: { type: "string", format: "email" }, password: { type: "string", minLength: 1, maxLength: 200 } } } },
}, async (req, reply) => {
  const result = await svc.login(req.body as { email: string; password: string });
  return result ?? reply.code(401).send({ error: "unauthorized" });
});

// /me/feed lives in an encapsulated plugin: request id -> logger -> CORS -> JWT
await app.register(async (scope) => {
  await scope.register(cors);
  scope.addHook("onRequest", async (req, reply) => { reply.header("x-request-id", req.id); });
  scope.addHook("onResponse", async (req, reply) => {
    logger.info({ reqId: req.id, method: req.method, url: req.url, status: reply.statusCode, ms: reply.elapsedTime });
  });
  scope.addHook("preHandler", async (req, reply) => {
    const userId = await svc.authenticate(req.headers.authorization);
    if (userId === null) return reply.code(401).send({ error: "unauthorized" });
    (req as unknown as { userId: number }).userId = userId;
  });
  scope.get("/me/feed", async (req) => svc.feed((req as unknown as { userId: number }).userId));
});

await app.listen({ port: config.port, host: HOST });
console.log(`fastify listening on ${config.port}`);
