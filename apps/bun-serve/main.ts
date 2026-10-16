import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { handle } from "../_fetch/handler.js";

(globalThis as any).Bun.serve({ port: config.port, hostname: HOST, fetch: handle });
console.log(`bun-serve listening on ${config.port}`);
