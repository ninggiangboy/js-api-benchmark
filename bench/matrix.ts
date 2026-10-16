export type Runtime = "node" | "bun" | "deno";

export interface Framework {
  id: string;
  label: string;
  /** Path of the compiled entry, relative to the project root. */
  main: string;
  runtimes: Runtime[];
  /** Runtimes where support is best effort: a failing smoke test is reported as N/A. */
  bestEffort?: Runtime[];
}

const app = (dir: string) => `dist/apps/${dir}/main.js`;

export const frameworks: Framework[] = [
  { id: "node-http", label: "node:http (baseline)", main: app("node-http"), runtimes: ["node", "bun", "deno"] },
  { id: "bun-serve", label: "Bun.serve (baseline)", main: app("bun-serve"), runtimes: ["bun"] },
  { id: "deno-serve", label: "Deno.serve (baseline)", main: app("deno-serve"), runtimes: ["deno"] },
  { id: "express", label: "Express 5", main: app("express"), runtimes: ["node", "bun", "deno"] },
  { id: "fastify", label: "Fastify", main: app("fastify"), runtimes: ["node", "bun", "deno"] },
  { id: "koa", label: "Koa", main: app("koa"), runtimes: ["node", "bun", "deno"] },
  { id: "hapi", label: "Hapi", main: app("hapi"), runtimes: ["node", "bun", "deno"] },
  { id: "nest-express", label: "NestJS (Express)", main: app("nest-express"), runtimes: ["node", "bun", "deno"], bestEffort: ["deno"] },
  { id: "nest-fastify", label: "NestJS (Fastify)", main: app("nest-fastify"), runtimes: ["node", "bun", "deno"], bestEffort: ["deno"] },
  { id: "hono", label: "Hono", main: app("hono"), runtimes: ["node", "bun", "deno"] },
  { id: "elysia", label: "Elysia", main: app("elysia"), runtimes: ["node", "bun", "deno"] },
  { id: "h3", label: "h3", main: app("h3"), runtimes: ["node", "bun", "deno"] },
  { id: "uws", label: "uWebSockets.js", main: app("uws"), runtimes: ["node", "bun"], bestEffort: ["bun"] },
  { id: "hyper-express", label: "HyperExpress", main: app("hyper-express"), runtimes: ["node", "bun"], bestEffort: ["bun"] },
];

export interface Combo {
  id: string; // e.g. "hono@bun"
  framework: Framework;
  runtime: Runtime;
}

export const combos: Combo[] = frameworks.flatMap((framework) =>
  framework.runtimes.map((runtime) => ({ id: `${framework.id}@${runtime}`, framework, runtime })));

export function commandFor(combo: Combo): [string, string[]] {
  const main = combo.framework.main;
  switch (combo.runtime) {
    case "node": return ["node", [main]];
    case "bun": return ["bun", [main]];
    case "deno": return ["deno", ["run", "-A", "--node-modules-dir=manual", main]];
  }
}

export function selectCombos(opts: { only?: string; runtime?: string }): Combo[] {
  const only = opts.only?.split(",");
  const runtimes = opts.runtime?.split(",");
  return combos.filter((c) =>
    (!only || only.includes(c.framework.id) || only.includes(c.id)) && (!runtimes || runtimes.includes(c.runtime)));
}
