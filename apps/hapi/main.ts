import Hapi, { type Request, type ResponseToolkit } from "@hapi/hapi";
import Boom from "@hapi/boom";
import { randomUUID } from "node:crypto";
import { z, type ZodType } from "zod";
import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { logger } from "../../shared/logger.js";
import * as svc from "../../shared/service.js";
import { bulkBody, createUserBody, idParam, listPostsQuery, loginBody, patchUserBody } from "../../shared/schemas.js";

const zod = <T>(schema: ZodType<T>) => async (value: unknown) => {
  const r = schema.safeParse(value);
  if (!r.success) throw Boom.badRequest("validation");
  return r.data;
};
const idParams = zod(z.object({ id: idParam }));

const server = Hapi.server({
  port: config.port,
  host: HOST,
  routes: {
    payload: { maxBytes: 1024 * 1024 },
    validate: { failAction: (_req, _h, err) => { throw err ?? Boom.badRequest(); } },
  },
});

server.ext("onPreResponse", (req, h) => {
  const res = req.response;
  if (Boom.isBoom(res)) {
    const status = res.output.statusCode;
    const error = status === 404 ? "not_found" : status === 401 ? "unauthorized" : status >= 500 ? "internal" : "validation";
    if (status >= 500) logger.error(res);
    return h.response({ error }).code(status);
  }
  return h.continue;
});

server.auth.scheme("jwt", () => ({
  authenticate: async (req: Request, h: ResponseToolkit) => {
    const userId = await svc.authenticate(req.headers.authorization as string | undefined);
    if (userId === null) throw Boom.unauthorized();
    return h.authenticated({ credentials: { userId } });
  },
}));
server.auth.strategy("jwt", "jwt");

server.route([
  { method: "GET", path: "/health", handler: (_r, h) => h.response("ok").type("text/plain") },
  { method: "GET", path: "/plaintext", handler: (_r, h) => h.response("Hello, World!").type("text/plain") },
  { method: "GET", path: "/json", handler: () => ({ message: "Hello, World!" }) },
  { method: "GET", path: "/large-json", handler: () => svc.buildLargePayload() },
  {
    method: "GET", path: "/users/{id}", options: { validate: { params: idParams } },
    handler: async (req) => (await svc.getUser((req.params as unknown as { id: number }).id)) ?? Boom.notFound(),
  },
  {
    method: "POST", path: "/users", options: { validate: { payload: zod(createUserBody) } },
    handler: async (req, h) => h.response(await svc.createUser(req.payload as { email: string; name: string })).code(201),
  },
  {
    method: "PATCH", path: "/users/{id}", options: { validate: { params: idParams, payload: zod(patchUserBody) } },
    handler: async (req) =>
      (await svc.patchUser((req.params as unknown as { id: number }).id, (req.payload as { name?: string }).name)) ?? Boom.notFound(),
  },
  {
    method: "GET", path: "/posts", options: { validate: { query: zod(listPostsQuery) } },
    handler: (req) => svc.listPosts(req.query as unknown as { limit: number; offset: number; authorId?: number }),
  },
  {
    method: "GET", path: "/cache/posts/{id}", options: { validate: { params: idParams } },
    handler: async (req) => (await svc.cachedPost((req.params as unknown as { id: number }).id)) ?? Boom.notFound(),
  },
  {
    method: "POST", path: "/bulk", options: { validate: { payload: zod(bulkBody) } },
    handler: (req) => svc.bulk(req.payload as { items: { id: number; value: number; label: string }[] }),
  },
  {
    method: "POST", path: "/auth/login", options: { validate: { payload: zod(loginBody) } },
    handler: async (req) => (await svc.login(req.payload as { email: string; password: string })) ?? Boom.unauthorized(),
  },
  {
    // /me/feed: request id -> logger -> CORS -> JWT
    method: "GET", path: "/me/feed",
    options: {
      auth: "jwt",
      cors: true,
      ext: {
        onPreAuth: {
          method: (req, h) => {
            (req.app as any).reqId = req.headers["x-request-id"] ?? randomUUID();
            (req.app as any).started = performance.now();
            return h.continue;
          },
        },
        onPreResponse: {
          method: (req, h) => {
            const res = req.response;
            const headers = Boom.isBoom(res) ? res.output.headers : res.headers;
            (headers as Record<string, unknown>)["x-request-id"] = (req.app as any).reqId;
            logger.info({ reqId: (req.app as any).reqId, method: req.method, url: req.path, status: Boom.isBoom(res) ? res.output.statusCode : res.statusCode, ms: performance.now() - (req.app as any).started });
            return h.continue;
          },
        },
      },
    },
    handler: (req) => svc.feed((req.auth.credentials as unknown as { userId: number }).userId),
  },
]);

await server.start();
console.log(`hapi listening on ${config.port}`);
