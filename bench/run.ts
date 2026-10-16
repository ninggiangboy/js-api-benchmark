import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { resetWrites } from "../db/lib.js";
import { sql } from "../shared/db.js";
import { redis } from "../shared/redis.js";
import { ensureFixtures, type Fixtures } from "./fixtures.js";
import { selectCombos, type Combo } from "./matrix.js";
import { BASE, ROOT, pinned, sampleProcess, startServer, StartError } from "./proc.js";
import { buildScenarios, type Scenario } from "./scenarios.js";

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : undefined; };

const quick = flag("quick");
const durationSec = Number(opt("duration") ?? (quick ? 10 : 20));
const warmupSec = Number(opt("warmup") ?? (quick ? 3 : 5));
const reps = Number(opt("reps") ?? (quick ? 1 : 3));
const mixRate = Number(opt("mix-rate") ?? 1500);
const mixDurationSec = Number(opt("mix-duration") ?? (quick ? 15 : 30));
const outDir = resolve(ROOT, opt("out") ?? `results/${new Date().toISOString().replace(/[:.]/g, "-")}`);

export interface Measurement {
  rps: number;
  p50: number; p90: number; p99: number; max: number; // milliseconds
  ok: number; nonOk: number; errors: number;
}
export interface ResultFile {
  combo: string; framework: string; runtime: string; scenario: string;
  median: Measurement; reps: Measurement[];
  peakRssMb: number; cpuPct: number; startupMs: number;
  config: { durationSec: number; reps: number; connections?: number };
}

function runProcess(cmd: string, args: string[], env?: NodeJS.ProcessEnv): Promise<{ code: number | null; stdout: string }> {
  return new Promise((res, rej) => {
    const [bin, binArgs] = pinned(cmd, args, "BENCH_LOADGEN_CPUS");
    const c = spawn(bin, binArgs, { cwd: ROOT, env: { ...process.env, ...env }, stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    c.stdout.on("data", (d) => { stdout += d; });
    c.on("error", rej);
    c.on("close", (code) => res({ code, stdout }));
  });
}

async function runOha(s: Scenario, seconds: number): Promise<Measurement> {
  const args = ["-z", `${seconds}s`, "-c", String(s.connections ?? 64), "--no-tui", "--output-format", "json", "-m", s.method!];
  for (const h of s.headers ?? []) args.push("-H", h);
  if (s.body) args.push(s.body.perLine ? "-Z" : "-D", s.body.file);
  if (s.randomUrl) args.push("--rand-regex-url");
  args.push(s.url!);
  const { code, stdout } = await runProcess("oha", args);
  if (code !== 0) throw new Error(`oha exited with ${code}`);
  const d = JSON.parse(stdout);
  let ok = 0, nonOk = 0, errors = 0;
  for (const [status, n] of Object.entries<number>(d.statusCodeDistribution)) (status.startsWith("2") ? (ok += n) : (nonOk += n));
  // oha aborts in-flight requests when the deadline hits; those are not server errors.
  for (const [msg, n] of Object.entries<number>(d.errorDistribution)) if (!msg.includes("deadline")) errors += n;
  const ms = (x: number) => Math.round(x * 1e6) / 1e3;
  return { rps: d.summary.requestsPerSec, p50: ms(d.latencyPercentiles.p50), p90: ms(d.latencyPercentiles.p90), p99: ms(d.latencyPercentiles.p99), max: ms(d.summary.slowest), ok, nonOk, errors };
}

async function runK6(fx: Fixtures, seconds: number): Promise<Measurement> {
  const summary = resolve(outDir, ".k6-summary.json");
  const { code } = await runProcess("k6", ["run", "--quiet", "--no-usage-report", "--summary-export", summary, "bench/mix.k6.js"],
    { BASE, TOKEN: fx.token, RATE: String(mixRate), DURATION: `${seconds}s` });
  if (code !== 0 && !existsSync(summary)) throw new Error(`k6 exited with ${code}`);
  const m = JSON.parse(readFileSync(summary, "utf8")).metrics;
  const dur = m.http_req_duration;
  const total = m.http_reqs.count as number;
  const failed = Math.round((m.http_req_failed.value ?? m.http_req_failed.rate ?? 0) * total);
  const dropped = m.dropped_iterations?.count ?? 0;
  const r = (x: number) => Math.round(x * 1e3) / 1e3;
  return { rps: m.http_reqs.rate, p50: r(dur.med), p90: r(dur["p(90)"]), p99: r(dur["p(99)"]), max: r(dur.max), ok: total - failed, nonOk: failed, errors: dropped };
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
const medianOf = (ms: Measurement[]): Measurement => {
  const out = {} as Measurement;
  for (const k of Object.keys(ms[0]) as (keyof Measurement)[]) out[k] = median(ms.map((m) => m[k]));
  return out;
};

async function restoreState(s: Scenario) {
  if (s.writes) await resetWrites();
  if (s.flushRedis) await redis.flushall();
}

async function runScenario(combo: Combo, s: Scenario, fx: Fixtures): Promise<ResultFile> {
  await restoreState(s);
  const server = await startServer(combo);
  const pid = server.child.pid!;
  try {
    const run = (sec: number) => (s.kind === "k6" ? runK6(fx, sec) : runOha(s, sec));
    if (warmupSec > 0) await run(warmupSec);
    const measurements: Measurement[] = [];
    let peakRssKb = 0, cpuSec = 0, wallSec = 0;
    for (let i = 0; i < reps; i++) {
      if (i > 0) await restoreState({ ...s, flushRedis: false });
      const before = sampleProcess(pid);
      const t0 = performance.now();
      const timer = setInterval(() => { try { peakRssKb = Math.max(peakRssKb, sampleProcess(pid).rssKb); } catch { /* process gone */ } }, 500);
      try {
        measurements.push(await run(s.kind === "k6" ? mixDurationSec : durationSec));
      } finally { clearInterval(timer); }
      const after = sampleProcess(pid);
      cpuSec += after.cpuSec - before.cpuSec;
      wallSec += (performance.now() - t0) / 1000;
      peakRssKb = Math.max(peakRssKb, after.rssKb);
      if (server.child.exitCode !== null) throw new Error(`server exited during run: ${server.stderr().trim().split("\n").slice(-2).join(" | ")}`);
    }
    return {
      combo: combo.id, framework: combo.framework.id, runtime: combo.runtime, scenario: s.id,
      median: medianOf(measurements), reps: measurements,
      peakRssMb: Math.round(peakRssKb / 1024), cpuPct: Math.round((cpuSec / wallSec) * 100), startupMs: server.startupMs,
      config: { durationSec: s.kind === "k6" ? mixDurationSec : durationSec, reps, connections: s.connections },
    };
  } finally {
    await server.stop();
    await restoreState({ ...s, flushRedis: false });
  }
}

async function main() {
  const fx = await ensureFixtures();
  const scenarioFilter = opt("scenario")?.split(",");
  const scenarios = buildScenarios(fx).filter((s) => !scenarioFilter || scenarioFilter.includes(s.id));
  const combos = selectCombos({ only: opt("only"), runtime: opt("runtime") });
  let supported: Record<string, { ok: boolean }> = {};
  try { supported = JSON.parse(readFileSync(resolve(ROOT, "results/supported.json"), "utf8")); } catch { console.warn("no results/supported.json; run `pnpm smoke` first"); }
  mkdirSync(resolve(outDir, "raw"), { recursive: true });
  console.log(`output: ${outDir}\n${combos.length} combos x ${scenarios.length} scenarios, ${reps} rep(s) x ${durationSec}s, warmup ${warmupSec}s`);

  for (const combo of combos) {
    if (supported[combo.id] && !supported[combo.id].ok) { console.log(`skip ${combo.id} (N/A)`); continue; }
    mkdirSync(resolve(outDir, "raw", combo.id), { recursive: true });
    for (const s of scenarios) {
      const file = resolve(outDir, "raw", combo.id, `${s.id}.json`);
      if (flag("resume") && existsSync(file)) continue;
      process.stdout.write(`${combo.id.padEnd(22)} ${s.id.padEnd(12)}`);
      try {
        const r = await runScenario(combo, s, fx);
        writeFileSync(file, JSON.stringify(r, null, 2));
        const m = r.median;
        console.log(`${Math.round(m.rps).toString().padStart(8)} rps  p50 ${m.p50}ms  p99 ${m.p99}ms  rss ${r.peakRssMb}MB  cpu ${r.cpuPct}%${m.nonOk + m.errors ? `  !! ${m.nonOk} non-2xx, ${m.errors} errors` : ""}`);
      } catch (e) {
        console.log(`FAILED: ${(e as Error).message}`);
        writeFileSync(file.replace(/\.json$/, ".error.json"), JSON.stringify({ combo: combo.id, scenario: s.id, error: (e as Error).message }, null, 2));
        if (!(e instanceof StartError)) await new Promise((r) => setTimeout(r, 1000));
      }
    }
  }
  await sql.end();
  redis.disconnect();
  console.log(`done -> ${outDir}\nreport: node dist/bench/report.js ${outDir}`);
}

await main();
