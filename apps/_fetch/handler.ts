import { randomUUID } from "node:crypto";
import * as svc from "../../shared/service.js";
import { logger } from "../../shared/logger.js";
import { bulkBody, createUserBody, listPostsQuery, loginBody, patchUserBody, parseId } from "../../shared/schemas.js";

const json = (body: unknown, status = 200, headers?: HeadersInit) => Response.json(body, { status, headers });
const text = (body: string) => new Response(body, { headers: { "content-type": "text/plain" } });
const invalid = () => json({ error: "validation" }, 400);
const notFound = () => json({ error: "not_found" }, 404);
const readJson = async (req: Request) => { try { return await req.json(); } catch { return undefined; } };

/** Hand-rolled Request -> Response router shared by the Bun.serve and Deno.serve baselines. */
export async function handle(req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const m = req.method;

    if (m === "GET") {
      switch (url.pathname) {
        case "/health": return text("ok");
        case "/plaintext": return text("Hello, World!");
        case "/json": return json({ message: "Hello, World!" });
        case "/large-json": return json(svc.buildLargePayload());
        case "/posts": {
          const q = listPostsQuery.safeParse(Object.fromEntries(url.searchParams));
          return q.success ? json(await svc.listPosts(q.data)) : invalid();
        }
        case "/me/feed": {
          const started = performance.now();
          const reqId = req.headers.get("x-request-id") ?? randomUUID();
          const headers = { "x-request-id": reqId, "access-control-allow-origin": "*", vary: "Origin" };
          const userId = await svc.authenticate(req.headers.get("authorization"));
          const res = userId === null ? json({ error: "unauthorized" }, 401, headers) : json(await svc.feed(userId), 200, headers);
          logger.info({ reqId, method: m, url: url.pathname, status: res.status, ms: performance.now() - started });
          return res;
        }
      }
      if (parts[0] === "users" && parts.length === 2) {
        const id = parseId(parts[1]);
        if (id === null) return invalid();
        const user = await svc.getUser(id);
        return user ? json(user) : notFound();
      }
      if (parts[0] === "cache" && parts[1] === "posts" && parts.length === 3) {
        const id = parseId(parts[2]);
        if (id === null) return invalid();
        const post = await svc.cachedPost(id);
        return post ? json(post) : notFound();
      }
    } else if (m === "POST") {
      if (url.pathname === "/users") {
        const b = createUserBody.safeParse(await readJson(req));
        return b.success ? json(await svc.createUser(b.data), 201) : invalid();
      }
      if (url.pathname === "/bulk") {
        const b = bulkBody.safeParse(await readJson(req));
        return b.success ? json(svc.bulk(b.data)) : invalid();
      }
      if (url.pathname === "/auth/login") {
        const b = loginBody.safeParse(await readJson(req));
        if (!b.success) return invalid();
        const r = await svc.login(b.data);
        return r ? json(r) : json({ error: "unauthorized" }, 401);
      }
    } else if (m === "PATCH" && parts[0] === "users" && parts.length === 2) {
      const id = parseId(parts[1]);
      const b = patchUserBody.safeParse(await readJson(req));
      if (id === null || !b.success) return invalid();
      const user = await svc.patchUser(id, b.data.name);
      return user ? json(user) : notFound();
    }
    return notFound();
  } catch (err) {
    logger.error(err as Error);
    return json({ error: "internal" }, 500);
  }
}
