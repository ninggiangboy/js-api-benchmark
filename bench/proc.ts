import { spawn, execFileSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { commandFor, type Combo } from "./matrix.js";

export const ROOT = resolve(import.meta.dirname, "..", "..");
export const PORT = 3000;
export const BASE = `http://127.0.0.1:${PORT}`;

export interface RunningServer {
  child: ChildProcess;
  startupMs: number;
  stderr: () => string;
  stop: () => Promise<void>;
}

export class StartError extends Error {}

/** On Linux, BENCH_SERVER_CPUS / BENCH_LOADGEN_CPUS (e.g. "0-3", "4-5") pin each side to its own cores. */
export function pinned(cmd: string, args: string[], cpusEnv: "BENCH_SERVER_CPUS" | "BENCH_LOADGEN_CPUS"): [string, string[]] {
  const cpus = process.env[cpusEnv];
  return process.platform === "linux" && cpus ? ["taskset", ["-c", cpus, cmd, ...args]].flat() as never : [cmd, args];
}

export async function startServer(combo: Combo, env: Record<string, string> = {}): Promise<RunningServer> {
  const [cmd, args] = pinned(...commandFor(combo), "BENCH_SERVER_CPUS");
  if (!existsSync(resolve(ROOT, combo.framework.main))) throw new StartError(`missing build output ${combo.framework.main}`);
  const t0 = performance.now();
  const child = spawn(cmd, args, { cwd: ROOT, env: { ...process.env, PORT: String(PORT), NODE_ENV: "production", ...env }, stdio: ["ignore", "ignore", "pipe"] });
  let err = "";
  child.stderr!.on("data", (d) => { err = (err + d).slice(-4000); });
  let exited = false;
  child.once("exit", () => { exited = true; });
  const stop = async () => {
    if (exited) return;
    child.kill("SIGTERM");
    await Promise.race([new Promise((r) => child.once("exit", r)), new Promise((r) => setTimeout(r, 3000))]);
    if (!exited) child.kill("SIGKILL");
  };
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (exited) throw new StartError(`process exited early: ${err.trim().split("\n").slice(-3).join(" | ")}`);
    try {
      const r = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(500) });
      if (r.ok) return { child, startupMs: Math.round(performance.now() - t0), stderr: () => err, stop };
    } catch { /* not ready yet */ }
    await new Promise((r) => setTimeout(r, 100));
  }
  await stop();
  throw new StartError(`timeout waiting for /health: ${err.trim().split("\n").slice(-3).join(" | ")}`);
}

function parseCpuTime(t: string): number {
  // ps prints [[dd-]hh:]mm:ss.ss
  const [days, rest] = t.includes("-") ? t.split("-") : ["0", t];
  const parts = rest.split(":").map(Number);
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return Number(days) * 86400 + sec;
}

/** Resident memory (KB) and cumulative cpu seconds of a pid and all of its descendants. */
export function sampleProcess(pid: number): { rssKb: number; cpuSec: number } {
  const out = execFileSync("ps", ["-A", "-o", "pid=,ppid=,rss=,time="], { encoding: "utf8" });
  const rows = out.trim().split("\n").map((l) => {
    const [p, pp, rss, time] = l.trim().split(/\s+/);
    return { p: Number(p), pp: Number(pp), rss: Number(rss), cpu: parseCpuTime(time) };
  });
  const pids = new Set([pid]);
  for (let grew = true; grew;) {
    grew = false;
    for (const r of rows) if (pids.has(r.pp) && !pids.has(r.p)) { pids.add(r.p); grew = true; }
  }
  let rssKb = 0, cpuSec = 0;
  for (const r of rows) if (pids.has(r.p)) { rssKb += r.rss; cpuSec += r.cpu; }
  return { rssKb, cpuSec };
}
