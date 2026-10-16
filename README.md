# JS web API framework benchmark

**[Live report: results of the first full run](https://ninggiangboy.github.io/js-api-benchmark/)** · [raw data](results/full-1) · [summary.csv](docs/summary.csv)

Benchmarks 14 server setups (Express, Fastify, Koa, Hapi, NestJS x2, Hono, Elysia, h3, uWebSockets.js,
HyperExpress and three bare-runtime baselines) on every runtime that can run them (Node, Bun, Deno): 36 combos (34 runnable).
Every combo implements the same API against the same Postgres/Redis data, each written the idiomatic way for
its framework (Fastify JSON schema, Elysia `t.Object`, Nest DTOs + guards, Zod elsewhere).

## Run it (macOS or Linux)

```bash
brew install oven-sh/bun/bun deno oha k6     # plus node + pnpm
pnpm install && pnpm build
pnpm db:up && pnpm db:seed                   # Postgres 18 + Redis 7 in Docker, 10k users / 100k posts
pnpm smoke                                   # checks every combo against the API contract -> results/supported.json
caffeinate -i pnpm bench --quick             # ~2h for the whole matrix; drop --quick for the full run (~8h)
pnpm report results/<run>                    # report.md, report.html, summary.csv
```

Runner options: `--only fastify,hono@bun`, `--runtime bun,deno`, `--scenario json,user-get`, `--duration 20 --warmup 5 --reps 3`,
`--mix-rate 1500`, `--out results/name`, `--resume` (skip finished scenario/combo pairs).

## Scenarios

| id | what it measures |
|---|---|
| plaintext, json, json-c256 | bare framework overhead (64 and 256 connections) |
| user-get, posts-list | Postgres PK lookup; JOIN with pagination and query validation |
| user-create, user-patch | body validation + INSERT/UPDATE (DB is restored between runs) |
| feed | request-id, logger, CORS, JWT verify, then a query |
| cache-hit | Redis cache-aside, all hits after warmup |
| large-json, bulk, login | ~100KB serialize, ~100KB parse + validate, scrypt + JWT sign |
| mix | k6 at a fixed arrival rate: 60% DB reads, 20% cache, 10% writes, 5% feed, 5% login |

## Method

One server process per scenario (fresh start, warmup, then N timed runs, median reported). RSS is the peak over
the run, CPU is cumulative CPU time of the process tree divided by wall time. Shared pieces are the same
everywhere: `postgres` driver (pool of 20), `ioredis`, `jose`, `node:crypto` scrypt, pino writing to /dev/null.

Caveats: on a Mac the load generator, server and Docker VM compete for the same cores and nothing is pinned. DB
scenarios are usually Postgres-bound, so frameworks look closer than they are. For cleaner numbers use Linux:

```bash
SERVER_CPUS=0-1 LOADGEN_CPUS=2-3 DB_CPUS=4-7 docker/run-linux.sh --quick
```

That builds one image with Node, Bun, Deno, oha and k6, pins server and load generator to separate cores with
`taskset`, and runs seed, smoke and benchmark with `--network host`.

uWebSockets.js and HyperExpress do not load on Bun (native addon) and Deno; those combos show up as N/A.
