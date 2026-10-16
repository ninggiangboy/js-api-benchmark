export type RuntimeName = "bun" | "deno" | "node";

export const runtime: RuntimeName = "Bun" in globalThis ? "bun" : "Deno" in globalThis ? "deno" : "node";

export const HOST = "127.0.0.1";
