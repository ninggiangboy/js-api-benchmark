import { config } from "../../shared/config.js";
import { HOST } from "../../shared/runtime.js";
import { handle } from "../_fetch/handler.js";

(globalThis as any).Deno.serve({ port: config.port, hostname: HOST, onListen() {} }, handle);
console.log(`deno-serve listening on ${config.port}`);
