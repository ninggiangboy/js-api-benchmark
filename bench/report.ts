import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { frameworks, combos } from "./matrix.js";
import { buildScenarios } from "./scenarios.js";
import type { ResultFile } from "./run.js";

const dir = resolve(process.argv[2] ?? "results/latest");
const scenarios = buildScenarios({ usersNdjson: "", bulkJson: "", loginJson: "", patchJson: "", token: "" });
const fwLabel = new Map(frameworks.map((f) => [f.id, f.label]));

// ---- load ----------------------------------------------------------------
const results: ResultFile[] = [];
const failures: { combo: string; scenario: string; error: string }[] = [];
const rawDir = resolve(dir, "raw");
for (const combo of existsSync(rawDir) ? readdirSync(rawDir) : []) {
  for (const f of readdirSync(resolve(rawDir, combo))) {
    const data = JSON.parse(readFileSync(resolve(rawDir, combo, f), "utf8"));
    (f.endsWith(".error.json") ? failures : results).push(data);
  }
}
if (!results.length) { console.error(`no results in ${rawDir}`); process.exit(1); }

let supported: Record<string, { ok: boolean; reason?: string }> = {};
try { supported = JSON.parse(readFileSync(resolve(dir, "../supported.json"), "utf8")); } catch { /* optional */ }
const notAvailable = Object.entries(supported).filter(([, v]) => !v.ok);

const byScenario = new Map<string, ResultFile[]>();
for (const r of results) byScenario.set(r.scenario, [...(byScenario.get(r.scenario) ?? []), r]);
const activeScenarios = scenarios.filter((s) => byScenario.has(s.id));
const lowerIsBetter = (id: string) => scenarios.find((s) => s.id === id)?.kind === "k6";
const metric = (r: ResultFile) => (lowerIsBetter(r.scenario) ? r.median.p99 : r.median.rps);
const sorted = (id: string) => [...(byScenario.get(id) ?? [])].sort((a, b) => lowerIsBetter(id) ? metric(a) - metric(b) : metric(b) - metric(a));
const label = (c: string) => { const [f, rt] = c.split("@"); return `${fwLabel.get(f) ?? f} on ${rt}`; };
const fmt = (n: number) => (n >= 100 ? Math.round(n).toLocaleString("en-US") : n.toFixed(n >= 10 ? 1 : 2));

// ---- overall score: geometric mean of rps relative to the best in each scenario ----
const scoreScenarios = activeScenarios.filter((s) => s.kind === "oha");
const best = new Map(scoreScenarios.map((s) => [s.id, Math.max(...(byScenario.get(s.id) ?? []).map((r) => r.median.rps))]));
const overall = combos.map((c) => {
  const rel = scoreScenarios.map((s) => byScenario.get(s.id)?.find((r) => r.combo === c.id)).filter(Boolean)
    .map((r) => r!.median.rps / best.get(r!.scenario)!);
  const score = rel.length ? Math.exp(rel.reduce((a, x) => a + Math.log(x), 0) / rel.length) * 100 : NaN;
  return { combo: c.id, framework: c.framework.id, runtime: c.runtime, score, covered: rel.length };
}).filter((o) => !Number.isNaN(o.score)).sort((a, b) => b.score - a.score);

// ---- CSV ---------------------------------------------------------------------
const csv = ["framework,runtime,scenario,rps,p50_ms,p90_ms,p99_ms,max_ms,non_2xx,errors,peak_rss_mb,cpu_pct,startup_ms"];
for (const r of results) {
  const m = r.median;
  csv.push([r.framework, r.runtime, r.scenario, m.rps.toFixed(1), m.p50, m.p90, m.p99, m.max, m.nonOk, m.errors, r.peakRssMb, r.cpuPct, r.startupMs].join(","));
}
writeFileSync(resolve(dir, "summary.csv"), csv.join("\n") + "\n");

// ---- Markdown ----------------------------------------------------------------
const sample = results[0].config;
const caveats = [
  `Each server runs as a single process (no cluster). Every scenario: fresh server, ${sample.durationSec}s measured x ${sample.reps} run(s), median reported.`,
  "Load generators (oha, k6) and Postgres/Redis (Docker) share the machine with the server, so absolute numbers depend on the host. Compare rows with each other, not with other benchmarks.",
  "Database scenarios are usually bounded by Postgres, which narrows the gap between frameworks. CPU-bound scenarios (large-json, bulk, login) show framework and runtime differences most clearly.",
  "Mixed traffic runs at a fixed arrival rate, so throughput is the same for everyone: compare tail latency and dropped iterations instead.",
];
const md: string[] = ["# JS web API framework benchmark", "", ...caveats.map((c) => `- ${c}`), "", "## Overall (geometric mean of RPS relative to the best in each scenario)", "",
  "| # | Framework | Runtime | Score | Scenarios |", "|---|---|---|---:|---:|"];
overall.forEach((o, i) => md.push(`| ${i + 1} | ${fwLabel.get(o.framework)} | ${o.runtime} | ${o.score.toFixed(1)} | ${o.covered}/${scoreScenarios.length} |`));
for (const s of activeScenarios) {
  const low = s.kind === "k6";
  md.push("", `## ${s.label}`, "", low ? "Lower p99 is better. Throughput is fixed by the load generator." : "Higher RPS is better.", "",
    "| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |", "|---|---|---:|---:|---:|---:|---:|---:|---:|");
  const rows = sorted(s.id);
  const top = metric(rows[0]);
  rows.forEach((r, i) => {
    const rel = low ? top / metric(r) : metric(r) / top;
    md.push(`| ${i + 1} | ${label(r.combo)} | ${fmt(r.median.rps)} | ${(rel * 100).toFixed(0)}% | ${r.median.p50} | ${r.median.p99} | ${r.peakRssMb} | ${r.cpuPct} | ${r.median.nonOk + r.median.errors} |`);
  });
}
if (notAvailable.length || failures.length) {
  md.push("", "## Not available / failed", "");
  for (const [id, v] of notAvailable) md.push(`- **${id}**: ${(v.reason ?? "").slice(0, 160)}`);
  for (const f of failures) md.push(`- **${f.combo} / ${f.scenario}**: ${f.error.slice(0, 160)}`);
}
writeFileSync(resolve(dir, "report.md"), md.join("\n") + "\n");

// ---- HTML ----------------------------------------------------------------------
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const rtClass = (rt: string) => `rt-${rt}`;

function barRows(rows: { name: string; runtime: string; value: number; text: string; tip: string; extra: string }[]) {
  const max = Math.max(...rows.map((r) => r.value));
  return rows.map((r) => `<div class="row" title="${esc(r.tip)}"><div class="name">${esc(r.name)}</div>
    <div class="track"><div class="bar ${rtClass(r.runtime)}" style="width:${Math.max(0.5, (r.value / max) * 100).toFixed(2)}%"></div></div>
    <div class="val">${esc(r.text)}</div><div class="extra">${esc(r.extra)}</div></div>`).join("");
}

const overallRows = barRows(overall.map((o) => ({
  name: label(o.combo), runtime: o.runtime, value: o.score, text: o.score.toFixed(1),
  tip: `${label(o.combo)}: score ${o.score.toFixed(1)} over ${o.covered}/${scoreScenarios.length} scenarios`, extra: o.covered < scoreScenarios.length ? `${o.covered}/${scoreScenarios.length} scn` : "",
})));

const scenarioHtml = activeScenarios.map((s) => {
  const low = s.kind === "k6";
  const rows = sorted(s.id);
  const chart = barRows(rows.map((r) => ({
    name: label(r.combo), runtime: r.runtime, value: low ? 1 / metric(r) : metric(r),
    text: low ? `${r.median.p99} ms` : fmt(r.median.rps),
    tip: `${label(r.combo)}\nRPS ${fmt(r.median.rps)}\np50 ${r.median.p50} ms, p90 ${r.median.p90} ms, p99 ${r.median.p99} ms\nRSS ${r.peakRssMb} MB, CPU ${r.cpuPct}%`,
    extra: `p99 ${low ? fmt(r.median.rps) + " rps" : r.median.p99 + " ms"}`,
  })));
  const table = rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(label(r.combo))}</td><td>${fmt(r.median.rps)}</td><td>${r.median.p50}</td><td>${r.median.p90}</td><td>${r.median.p99}</td><td>${r.peakRssMb}</td><td>${r.cpuPct}</td><td>${r.median.nonOk + r.median.errors}</td></tr>`).join("");
  return `<section id="${s.id}"><h2>${esc(s.label)}</h2>
    <p class="note">${low ? "Bar = p99 latency at a fixed arrival rate (shorter is better). Right column shows achieved RPS." : "Bar = requests per second (longer is better). Right column shows p99 latency."}</p>
    <div class="chart">${chart}</div>
    <details><summary>Table view</summary><div class="scroll"><table><thead><tr><th>#</th><th>Combo</th><th>RPS</th><th>p50 ms</th><th>p90 ms</th><th>p99 ms</th><th>RSS MB</th><th>CPU %</th><th>Errors</th></tr></thead><tbody>${table}</tbody></table></div></details></section>`;
}).join("");

// framework x runtime heatmap of the overall score (sequential, single hue)
const maxScore = Math.max(...overall.map((o) => o.score));
const heatRows = frameworks.map((f) => {
  const cells = (["node", "bun", "deno"] as const).map((rt) => {
    const o = overall.find((x) => x.framework === f.id && x.runtime === rt);
    if (!o) return `<td class="na">${!f.runtimes.includes(rt) ? "–" : supported[`${f.id}@${rt}`]?.ok === false ? "N/A" : "not run"}</td>`;
    const t = o.score / maxScore;
    return `<td class="heat" style="--t:${(t * 100).toFixed(0)}%" title="${esc(label(o.combo))}: ${o.score.toFixed(1)}"><span>${o.score.toFixed(1)}</span></td>`;
  }).join("");
  return `<tr><th>${esc(f.label)}</th>${cells}</tr>`;
}).join("");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JS API Benchmark</title><style>
:root{color-scheme:light;--bg:#fcfcfb;--panel:#f4f4f2;--ink:#0b0b0b;--ink2:#52514e;--ink3:#7b7a75;--line:#e3e2de;--rt-node:#2a78d6;--rt-bun:#eb6834;--rt-deno:#1baf7a;--heat:#2a78d6}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#1a1a19;--panel:#232321;--ink:#f0efec;--ink2:#c3c2b7;--ink3:#97968d;--line:#34332f;--rt-node:#3987e5;--rt-bun:#d95926;--rt-deno:#199e70;--heat:#3987e5}}
:root[data-theme="dark"]{color-scheme:dark;--bg:#1a1a19;--panel:#232321;--ink:#f0efec;--ink2:#c3c2b7;--ink3:#97968d;--line:#34332f;--rt-node:#3987e5;--rt-bun:#d95926;--rt-deno:#199e70;--heat:#3987e5}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,sans-serif}
main{max-width:1040px;margin:0 auto;padding:32px 16px 64px}h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:36px 0 4px}
.note,.sub{color:var(--ink2);margin:4px 0 14px;font-size:14px}ul.caveats{color:var(--ink2);font-size:14px;padding-left:20px}
nav{display:flex;flex-wrap:wrap;gap:6px 14px;margin:14px 0;font-size:13px}nav a{color:var(--ink2)}
.legend{display:flex;gap:16px;font-size:13px;color:var(--ink2);margin:8px 0 12px}.legend i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:6px}
.row{display:grid;grid-template-columns:minmax(120px,230px) 1fr 76px 92px;gap:10px;align-items:center;padding:3px 0;font-size:13px}
.name{color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.track{height:12px}
.bar{height:12px;border-radius:0 4px 4px 0;min-width:2px}.val{text-align:right;font-variant-numeric:tabular-nums}.extra{color:var(--ink3);font-size:12px;font-variant-numeric:tabular-nums}
.rt-node{background:var(--rt-node)}.rt-bun{background:var(--rt-bun)}.rt-deno{background:var(--rt-deno)}
.row:hover{background:var(--panel)}
details{margin-top:8px;font-size:13px;color:var(--ink2)}summary{cursor:pointer}.scroll{overflow-x:auto}
table{border-collapse:collapse;width:100%;font-size:13px;font-variant-numeric:tabular-nums}th,td{padding:4px 8px;text-align:right;border-bottom:1px solid var(--line);white-space:nowrap}
th:nth-child(2),td:nth-child(2),table.heatmap th{text-align:left}table.heatmap td{text-align:center;padding:2px}
td.heat span{display:block;padding:6px 8px;border-radius:4px;background:color-mix(in srgb,var(--heat) var(--t),var(--bg));color:var(--ink)}
td.heat{font-weight:600}td.na{color:var(--ink3)}
@media (max-width:640px){.row{grid-template-columns:1fr 70px}.track{grid-column:1/-1;order:3}.extra{display:none}}
</style></head><body><main>
<h1>JS web API framework benchmark</h1>
<p class="sub">Framework x runtime, realistic API workloads. Results folder: ${esc(dir.split("/").pop() ?? "")}</p>
<ul class="caveats">${caveats.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
<div class="legend"><span><i style="background:var(--rt-node)"></i>Node</span><span><i style="background:var(--rt-bun)"></i>Bun</span><span><i style="background:var(--rt-deno)"></i>Deno</span></div>
<nav>${activeScenarios.map((s) => `<a href="#${s.id}">${esc(s.id)}</a>`).join("")}</nav>
<section><h2>Overall score</h2><p class="note">Geometric mean of RPS relative to the best combo in each throughput scenario (100 = best everywhere).</p>
<div class="chart">${overallRows}</div>
<h2>Framework x runtime</h2><div class="scroll"><table class="heatmap"><thead><tr><th>Framework</th><th>Node</th><th>Bun</th><th>Deno</th></tr></thead><tbody>${heatRows}</tbody></table></div></section>
${scenarioHtml}
${notAvailable.length || failures.length ? `<section><h2>Not available / failed</h2><ul class="caveats">${[...notAvailable.map(([id, v]) => `<li><b>${esc(id)}</b>: ${esc((v.reason ?? "").slice(0, 160))}</li>`), ...failures.map((f) => `<li><b>${esc(f.combo)} / ${esc(f.scenario)}</b>: ${esc(f.error.slice(0, 160))}</li>`)].join("")}</ul></section>` : ""}
</main></body></html>`;
writeFileSync(resolve(dir, "report.html"), html);
console.log(`wrote ${resolve(dir, "report.md")}\n      ${resolve(dir, "report.html")}\n      ${resolve(dir, "summary.csv")}`);
