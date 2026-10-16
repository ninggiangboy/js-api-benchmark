# JS web API framework benchmark

- Each server runs as a single process (no cluster). Every scenario: fresh server, 20s measured x 3 run(s), median reported.
- Load generators (oha, k6) and Postgres/Redis (Docker) share the machine with the server, so absolute numbers depend on the host. Compare rows with each other, not with other benchmarks.
- Database scenarios are usually bounded by Postgres, which narrows the gap between frameworks. CPU-bound scenarios (large-json, bulk, login) show framework and runtime differences most clearly.
- Mixed traffic runs at a fixed arrival rate, so throughput is the same for everyone: compare tail latency and dropped iterations instead.

## Overall (geometric mean of RPS relative to the best in each scenario)

| # | Framework | Runtime | Score | Scenarios |
|---|---|---|---:|---:|
| 1 | Elysia | bun | 87.3 | 12/12 |
| 2 | h3 | bun | 86.6 | 12/12 |
| 3 | Hono | bun | 86.4 | 12/12 |
| 4 | uWebSockets.js | node | 79.4 | 12/12 |
| 5 | Bun.serve (baseline) | bun | 78.3 | 12/12 |
| 6 | Fastify | bun | 76.9 | 12/12 |
| 7 | HyperExpress | node | 74.0 | 12/12 |
| 8 | Koa | bun | 73.7 | 12/12 |
| 9 | Express 5 | bun | 71.7 | 12/12 |
| 10 | Hono | deno | 69.6 | 12/12 |
| 11 | h3 | deno | 67.9 | 12/12 |
| 12 | Deno.serve (baseline) | deno | 67.2 | 12/12 |
| 13 | Hapi | bun | 66.7 | 12/12 |
| 14 | Elysia | deno | 65.7 | 12/12 |
| 15 | NestJS (Fastify) | bun | 61.0 | 12/12 |
| 16 | node:http (baseline) | bun | 60.8 | 12/12 |
| 17 | Hono | node | 60.6 | 12/12 |
| 18 | Fastify | node | 59.2 | 12/12 |
| 19 | Elysia | node | 58.9 | 12/12 |
| 20 | Fastify | deno | 57.9 | 12/12 |
| 21 | h3 | node | 57.4 | 12/12 |
| 22 | Koa | node | 57.4 | 12/12 |
| 23 | node:http (baseline) | node | 57.1 | 12/12 |
| 24 | NestJS (Express) | bun | 56.9 | 12/12 |
| 25 | Koa | deno | 56.6 | 12/12 |
| 26 | Express 5 | node | 52.6 | 12/12 |
| 27 | NestJS (Fastify) | node | 51.1 | 12/12 |
| 28 | Hapi | node | 50.4 | 12/12 |
| 29 | NestJS (Fastify) | deno | 49.5 | 12/12 |
| 30 | node:http (baseline) | deno | 49.5 | 12/12 |
| 31 | Express 5 | deno | 46.9 | 12/12 |
| 32 | Hapi | deno | 46.9 | 12/12 |
| 33 | NestJS (Express) | node | 43.9 | 12/12 |
| 34 | NestJS (Express) | deno | 39.9 | 12/12 |

## GET /plaintext

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | uWebSockets.js on node | 139,732 | 100% | 0.4 | 0.87 | 93 | 97 | 0 |
| 2 | Hono on bun | 125,903 | 90% | 0.445 | 1.033 | 67 | 99 | 0 |
| 3 | Hono on deno | 123,760 | 89% | 0.51 | 0.651 | 102 | 97 | 0 |
| 4 | Elysia on deno | 119,204 | 85% | 0.53 | 0.673 | 89 | 97 | 0 |
| 5 | Elysia on bun | 117,899 | 84% | 0.483 | 1.14 | 70 | 99 | 0 |
| 6 | h3 on bun | 113,334 | 81% | 0.506 | 1.123 | 68 | 99 | 0 |
| 7 | HyperExpress on node | 110,570 | 79% | 0.532 | 1.124 | 114 | 98 | 0 |
| 8 | h3 on deno | 105,064 | 75% | 0.579 | 1.763 | 172 | 110 | 0 |
| 9 | Deno.serve (baseline) on deno | 102,347 | 73% | 0.618 | 0.781 | 102 | 97 | 0 |
| 10 | node:http (baseline) on node | 89,332 | 64% | 0.675 | 1.407 | 124 | 97 | 0 |
| 11 | Bun.serve (baseline) on bun | 85,112 | 61% | 0.68 | 1.539 | 62 | 99 | 0 |
| 12 | Hono on node | 84,843 | 61% | 0.714 | 1.483 | 128 | 98 | 0 |
| 13 | Fastify on bun | 81,445 | 58% | 0.709 | 1.682 | 122 | 98 | 0 |
| 14 | Elysia on node | 79,978 | 57% | 0.76 | 1.566 | 128 | 98 | 0 |
| 15 | NestJS (Fastify) on bun | 77,389 | 55% | 0.774 | 1.593 | 154 | 99 | 0 |
| 16 | Express 5 on bun | 72,984 | 52% | 0.82 | 1.697 | 121 | 99 | 0 |
| 17 | Fastify on node | 72,248 | 52% | 0.826 | 1.789 | 126 | 98 | 0 |
| 18 | NestJS (Fastify) on node | 71,560 | 51% | 0.854 | 1.757 | 184 | 98 | 0 |
| 19 | Koa on bun | 71,151 | 51% | 0.846 | 1.733 | 123 | 100 | 0 |
| 20 | NestJS (Express) on bun | 67,681 | 48% | 0.889 | 1.818 | 156 | 99 | 0 |
| 21 | Fastify on deno | 67,430 | 48% | 0.891 | 2.625 | 196 | 116 | 0 |
| 22 | Koa on node | 59,143 | 42% | 1.02 | 2.185 | 132 | 98 | 0 |
| 23 | node:http (baseline) on bun | 58,993 | 42% | 1.032 | 2.18 | 95 | 99 | 0 |
| 24 | NestJS (Fastify) on deno | 57,858 | 41% | 1.043 | 2.594 | 254 | 116 | 0 |
| 25 | Koa on deno | 57,398 | 41% | 1.033 | 2.736 | 196 | 120 | 0 |
| 26 | Hapi on bun | 56,384 | 40% | 1.074 | 2.177 | 143 | 100 | 0 |
| 27 | h3 on node | 49,884 | 36% | 1.158 | 2.908 | 137 | 98 | 0 |
| 28 | Express 5 on node | 49,366 | 35% | 1.233 | 2.519 | 167 | 98 | 0 |
| 29 | Hapi on node | 49,041 | 35% | 1.258 | 2.546 | 191 | 98 | 0 |
| 30 | Hapi on deno | 44,848 | 32% | 1.281 | 3.366 | 212 | 133 | 0 |
| 31 | Express 5 on deno | 43,379 | 31% | 1.396 | 3.125 | 196 | 115 | 0 |
| 32 | NestJS (Express) on node | 42,938 | 31% | 1.438 | 2.918 | 183 | 99 | 0 |
| 33 | NestJS (Express) on deno | 40,254 | 29% | 1.501 | 3.141 | 235 | 116 | 0 |
| 34 | node:http (baseline) on deno | 40,043 | 29% | 1.545 | 2.57 | 173 | 103 | 0 |

## GET /json

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | uWebSockets.js on node | 130,406 | 100% | 0.434 | 0.939 | 93 | 97 | 0 |
| 2 | HyperExpress on node | 110,096 | 84% | 0.534 | 1.125 | 113 | 98 | 0 |
| 3 | Elysia on bun | 96,637 | 74% | 0.588 | 1.325 | 70 | 99 | 0 |
| 4 | h3 on deno | 89,962 | 69% | 0.682 | 2.129 | 171 | 109 | 0 |
| 5 | node:http (baseline) on node | 89,229 | 68% | 0.679 | 1.4 | 124 | 98 | 0 |
| 6 | Hono on bun | 88,477 | 68% | 0.649 | 1.479 | 67 | 99 | 0 |
| 7 | Hono on deno | 83,327 | 64% | 0.749 | 0.975 | 102 | 97 | 0 |
| 8 | Elysia on deno | 82,234 | 63% | 0.772 | 0.981 | 89 | 97 | 0 |
| 9 | h3 on bun | 80,299 | 62% | 0.735 | 1.632 | 69 | 99 | 0 |
| 10 | Bun.serve (baseline) on bun | 73,376 | 56% | 0.787 | 1.81 | 65 | 99 | 0 |
| 11 | Deno.serve (baseline) on deno | 71,194 | 55% | 0.877 | 1.14 | 102 | 97 | 0 |
| 12 | Hono on node | 63,708 | 49% | 0.945 | 1.964 | 128 | 98 | 0 |
| 13 | Elysia on node | 61,076 | 47% | 1.006 | 2.065 | 129 | 98 | 0 |
| 14 | NestJS (Fastify) on bun | 59,641 | 46% | 1.017 | 2.084 | 154 | 99 | 0 |
| 15 | Fastify on node | 58,063 | 45% | 1.058 | 2.198 | 127 | 98 | 0 |
| 16 | NestJS (Fastify) on node | 57,658 | 44% | 1.071 | 2.193 | 183 | 98 | 0 |
| 17 | Fastify on bun | 57,152 | 44% | 1.042 | 2.32 | 133 | 99 | 0 |
| 18 | h3 on node | 56,901 | 44% | 1.087 | 2.26 | 126 | 98 | 0 |
| 19 | Express 5 on bun | 55,299 | 42% | 1.081 | 2.306 | 118 | 99 | 0 |
| 20 | Koa on bun | 54,752 | 42% | 1.109 | 2.262 | 117 | 100 | 0 |
| 21 | NestJS (Express) on bun | 51,880 | 40% | 1.163 | 2.369 | 156 | 100 | 0 |
| 22 | NestJS (Fastify) on deno | 51,671 | 40% | 1.17 | 2.905 | 254 | 116 | 0 |
| 23 | Fastify on deno | 50,099 | 38% | 1.203 | 3.248 | 193 | 115 | 0 |
| 24 | node:http (baseline) on bun | 48,487 | 37% | 1.252 | 2.6 | 95 | 99 | 0 |
| 25 | Koa on node | 48,013 | 37% | 1.272 | 2.601 | 134 | 98 | 0 |
| 26 | Hapi on bun | 47,570 | 36% | 1.27 | 2.58 | 140 | 100 | 0 |
| 27 | Koa on deno | 45,475 | 35% | 1.317 | 3.225 | 201 | 118 | 0 |
| 28 | Hapi on node | 40,162 | 31% | 1.546 | 3.114 | 195 | 98 | 0 |
| 29 | NestJS (Express) on node | 38,937 | 30% | 1.58 | 3.191 | 183 | 99 | 0 |
| 30 | Express 5 on node | 38,515 | 30% | 1.582 | 3.18 | 169 | 98 | 0 |
| 31 | node:http (baseline) on deno | 38,328 | 29% | 1.591 | 2.58 | 175 | 103 | 0 |
| 32 | Hapi on deno | 38,172 | 29% | 1.515 | 3.949 | 209 | 132 | 0 |
| 33 | NestJS (Express) on deno | 38,055 | 29% | 1.595 | 3.385 | 236 | 116 | 0 |
| 34 | Express 5 on deno | 35,507 | 27% | 1.707 | 3.756 | 196 | 114 | 0 |

## GET /json (256 conns)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | uWebSockets.js on node | 140,376 | 100% | 1.705 | 3.436 | 93 | 97 | 0 |
| 2 | HyperExpress on node | 101,734 | 72% | 2.462 | 4.808 | 115 | 98 | 0 |
| 3 | Elysia on bun | 101,299 | 72% | 2.443 | 4.867 | 71 | 99 | 0 |
| 4 | Hono on bun | 91,344 | 65% | 2.678 | 5.303 | 68 | 99 | 0 |
| 5 | Hono on deno | 89,120 | 63% | 2.891 | 3.51 | 108 | 97 | 0 |
| 6 | Elysia on deno | 83,705 | 60% | 2.961 | 3.824 | 94 | 97 | 0 |
| 7 | h3 on bun | 82,597 | 59% | 3.019 | 5.954 | 70 | 99 | 0 |
| 8 | Deno.serve (baseline) on deno | 80,500 | 57% | 3.076 | 4.004 | 108 | 97 | 0 |
| 9 | h3 on deno | 76,837 | 55% | 3.238 | 5.372 | 178 | 108 | 0 |
| 10 | Bun.serve (baseline) on bun | 71,735 | 51% | 3.403 | 6.667 | 63 | 99 | 0 |
| 11 | Fastify on bun | 66,574 | 47% | 3.775 | 5.223 | 139 | 99 | 0 |
| 12 | Fastify on node | 64,540 | 46% | 3.943 | 4.924 | 157 | 98 | 0 |
| 13 | Hono on node | 64,040 | 46% | 3.922 | 4.921 | 157 | 98 | 0 |
| 14 | h3 on node | 62,268 | 44% | 4.09 | 5.014 | 155 | 98 | 0 |
| 15 | Elysia on node | 61,220 | 44% | 4.157 | 5.134 | 159 | 98 | 0 |
| 16 | NestJS (Fastify) on bun | 58,962 | 42% | 4.262 | 5.669 | 170 | 99 | 0 |
| 17 | NestJS (Fastify) on node | 56,391 | 40% | 4.53 | 5.431 | 190 | 98 | 0 |
| 18 | Express 5 on bun | 56,300 | 40% | 4.385 | 5.817 | 139 | 100 | 0 |
| 19 | node:http (baseline) on node | 55,189 | 39% | 4.503 | 6.026 | 152 | 97 | 0 |
| 20 | Koa on bun | 54,520 | 39% | 4.632 | 5.943 | 146 | 100 | 0 |
| 21 | Fastify on deno | 53,825 | 38% | 4.688 | 6.784 | 200 | 104 | 0 |
| 22 | NestJS (Express) on bun | 53,100 | 38% | 4.741 | 6.168 | 172 | 100 | 0 |
| 23 | Koa on node | 52,884 | 38% | 4.786 | 5.547 | 167 | 99 | 0 |
| 24 | NestJS (Fastify) on deno | 50,482 | 36% | 4.938 | 6.942 | 255 | 105 | 0 |
| 25 | node:http (baseline) on bun | 46,906 | 33% | 5.37 | 7.161 | 122 | 99 | 0 |
| 26 | Koa on deno | 46,307 | 33% | 5.384 | 8.149 | 209 | 106 | 0 |
| 27 | Hapi on bun | 46,002 | 33% | 5.498 | 6.855 | 189 | 100 | 0 |
| 28 | Express 5 on node | 43,217 | 31% | 5.89 | 6.782 | 172 | 98 | 1 |
| 29 | Hapi on node | 41,075 | 29% | 6.201 | 7.256 | 200 | 99 | 1974 |
| 30 | NestJS (Express) on node | 38,666 | 28% | 6.536 | 7.765 | 191 | 99 | 4014 |
| 31 | node:http (baseline) on deno | 38,099 | 27% | 6.443 | 10.575 | 179 | 104 | 0 |
| 32 | Hapi on deno | 36,531 | 26% | 6.654 | 13.085 | 234 | 124 | 0 |
| 33 | Express 5 on deno | 36,075 | 26% | 6.74 | 11.553 | 208 | 115 | 0 |
| 34 | NestJS (Express) on deno | 33,951 | 24% | 7.201 | 12.308 | 242 | 117 | 0 |

## GET /users/:id (Postgres PK lookup)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Elysia on bun | 11,946 | 100% | 5.339 | 8.295 | 115 | 99 | 0 |
| 2 | Hono on bun | 11,934 | 100% | 5.314 | 8.334 | 114 | 99 | 0 |
| 3 | NestJS (Fastify) on bun | 11,766 | 98% | 5.383 | 8.499 | 189 | 100 | 0 |
| 4 | Fastify on bun | 11,756 | 98% | 5.426 | 8.437 | 162 | 99 | 0 |
| 5 | Koa on bun | 11,605 | 97% | 5.462 | 8.636 | 158 | 100 | 0 |
| 6 | NestJS (Express) on bun | 11,601 | 97% | 5.452 | 8.683 | 192 | 100 | 0 |
| 7 | h3 on bun | 11,593 | 97% | 5.475 | 8.638 | 109 | 99 | 0 |
| 8 | Hapi on bun | 11,587 | 97% | 5.472 | 8.736 | 170 | 100 | 0 |
| 9 | Express 5 on bun | 11,443 | 96% | 5.545 | 8.681 | 155 | 100 | 0 |
| 10 | Bun.serve (baseline) on bun | 11,244 | 94% | 5.662 | 8.84 | 107 | 99 | 0 |
| 11 | node:http (baseline) on bun | 10,137 | 85% | 6.215 | 9.731 | 118 | 100 | 0 |
| 12 | h3 on deno | 8,948 | 75% | 7.611 | 10.341 | 199 | 102 | 0 |
| 13 | Fastify on deno | 8,909 | 75% | 7.274 | 10.672 | 221 | 104 | 0 |
| 14 | uWebSockets.js on node | 8,810 | 74% | 7.277 | 10.683 | 179 | 101 | 0 |
| 15 | Koa on deno | 8,725 | 73% | 7.398 | 11.132 | 226 | 105 | 0 |
| 16 | Hapi on deno | 8,721 | 73% | 7.339 | 11.903 | 237 | 109 | 0 |
| 17 | Elysia on deno | 8,719 | 73% | 7.804 | 10.58 | 177 | 101 | 0 |
| 18 | Hono on deno | 8,718 | 73% | 7.794 | 10.676 | 189 | 101 | 0 |
| 19 | NestJS (Fastify) on deno | 8,651 | 72% | 7.397 | 10.806 | 279 | 104 | 0 |
| 20 | Hono on node | 8,643 | 72% | 7.428 | 10.941 | 212 | 101 | 0 |
| 21 | Fastify on node | 8,618 | 72% | 7.427 | 10.93 | 208 | 101 | 0 |
| 22 | Elysia on node | 8,618 | 72% | 7.438 | 10.861 | 210 | 101 | 0 |
| 23 | NestJS (Fastify) on node | 8,609 | 72% | 7.48 | 10.996 | 263 | 101 | 0 |
| 24 | NestJS (Express) on node | 8,588 | 72% | 7.468 | 11.175 | 253 | 101 | 0 |
| 25 | HyperExpress on node | 8,585 | 72% | 7.469 | 11.115 | 194 | 103 | 0 |
| 26 | Deno.serve (baseline) on deno | 8,576 | 72% | 7.939 | 10.81 | 188 | 100 | 0 |
| 27 | Hapi on node | 8,571 | 72% | 7.44 | 11.403 | 191 | 101 | 0 |
| 28 | h3 on node | 8,536 | 71% | 7.543 | 11.038 | 209 | 101 | 0 |
| 29 | Express 5 on node | 8,521 | 71% | 7.535 | 11.203 | 196 | 101 | 0 |
| 30 | Express 5 on deno | 8,508 | 71% | 7.414 | 11.248 | 215 | 104 | 0 |
| 31 | NestJS (Express) on deno | 8,504 | 71% | 7.502 | 11.002 | 256 | 105 | 0 |
| 32 | Koa on node | 8,502 | 71% | 7.523 | 11.322 | 202 | 101 | 0 |
| 33 | node:http (baseline) on deno | 8,161 | 68% | 7.954 | 11.419 | 180 | 102 | 0 |
| 34 | node:http (baseline) on node | 8,012 | 67% | 7.995 | 11.745 | 175 | 101 | 0 |

## GET /posts (JOIN + pagination)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | HyperExpress on node | 6,157 | 100% | 9.5 | 29.962 | 201 | 93 | 0 |
| 2 | h3 on deno | 5,870 | 95% | 10.121 | 30.19 | 194 | 92 | 0 |
| 3 | uWebSockets.js on node | 5,863 | 95% | 9.769 | 34.585 | 195 | 92 | 0 |
| 4 | Elysia on bun | 5,690 | 92% | 7.526 | 52.819 | 113 | 68 | 0 |
| 5 | Hono on bun | 5,661 | 92% | 8.346 | 49.387 | 111 | 72 | 0 |
| 6 | Hono on deno | 5,571 | 90% | 10.548 | 34.279 | 181 | 90 | 0 |
| 7 | Fastify on bun | 5,453 | 89% | 8.938 | 49.008 | 151 | 75 | 0 |
| 8 | h3 on bun | 5,432 | 88% | 8.795 | 50.138 | 105 | 71 | 0 |
| 9 | NestJS (Fastify) on bun | 5,424 | 88% | 9.78 | 44.751 | 202 | 83 | 0 |
| 10 | Elysia on node | 5,372 | 87% | 11.294 | 31.33 | 210 | 91 | 0 |
| 11 | Koa on bun | 5,371 | 87% | 9.723 | 47.978 | 156 | 79 | 0 |
| 12 | Hono on node | 5,366 | 87% | 11.094 | 34.054 | 209 | 90 | 0 |
| 13 | Express 5 on bun | 5,311 | 86% | 9.175 | 49.815 | 156 | 77 | 0 |
| 14 | NestJS (Express) on bun | 5,311 | 86% | 9.893 | 43.179 | 196 | 85 | 0 |
| 15 | Elysia on deno | 5,293 | 86% | 11.18 | 35.524 | 180 | 91 | 0 |
| 16 | NestJS (Fastify) on deno | 5,225 | 85% | 11.605 | 33.782 | 256 | 95 | 0 |
| 17 | NestJS (Fastify) on node | 5,140 | 83% | 11.645 | 33.805 | 274 | 91 | 0 |
| 18 | Fastify on node | 5,129 | 83% | 11.723 | 33.965 | 210 | 96 | 0 |
| 19 | Koa on node | 5,104 | 83% | 11.811 | 34.024 | 217 | 91 | 0 |
| 20 | Koa on deno | 5,084 | 83% | 11.9 | 33.459 | 219 | 94 | 0 |
| 21 | Deno.serve (baseline) on deno | 5,076 | 82% | 11.701 | 36.674 | 179 | 91 | 0 |
| 22 | Fastify on deno | 5,073 | 82% | 11.729 | 34.351 | 207 | 98 | 0 |
| 23 | NestJS (Express) on node | 4,958 | 81% | 12.563 | 29.603 | 252 | 94 | 0 |
| 24 | Express 5 on node | 4,835 | 79% | 12.703 | 31.35 | 216 | 97 | 0 |
| 25 | Bun.serve (baseline) on bun | 4,835 | 79% | 10.335 | 55.788 | 98 | 72 | 0 |
| 26 | NestJS (Express) on deno | 4,831 | 78% | 12.834 | 28.339 | 247 | 98 | 0 |
| 27 | Express 5 on deno | 4,823 | 78% | 12.747 | 28.917 | 208 | 101 | 0 |
| 28 | Hapi on bun | 4,790 | 78% | 12.533 | 35.562 | 221 | 109 | 0 |
| 29 | h3 on node | 4,616 | 75% | 13.206 | 36.637 | 209 | 89 | 0 |
| 30 | Hapi on deno | 4,511 | 73% | 13.631 | 26.41 | 260 | 106 | 0 |
| 31 | node:http (baseline) on node | 4,354 | 71% | 14.358 | 28.538 | 202 | 94 | 0 |
| 32 | Hapi on node | 4,223 | 69% | 14.895 | 28.46 | 276 | 124 | 0 |
| 33 | node:http (baseline) on deno | 3,922 | 64% | 15.419 | 44.801 | 184 | 93 | 0 |
| 34 | node:http (baseline) on bun | 3,810 | 62% | 13.356 | 71.938 | 119 | 70 | 0 |

## POST /users (validate + INSERT)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Hono on bun | 11,653 | 100% | 5.397 | 8.93 | 115 | 97 | 0 |
| 2 | Elysia on bun | 11,651 | 100% | 5.344 | 8.592 | 119 | 97 | 0 |
| 3 | Fastify on bun | 11,413 | 98% | 5.516 | 8.932 | 186 | 98 | 0 |
| 4 | h3 on bun | 11,388 | 98% | 5.529 | 9.312 | 120 | 97 | 0 |
| 5 | Bun.serve (baseline) on bun | 11,201 | 96% | 5.653 | 9.087 | 106 | 97 | 0 |
| 6 | Koa on bun | 11,121 | 95% | 5.622 | 9.15 | 176 | 98 | 0 |
| 7 | Express 5 on bun | 11,062 | 95% | 5.647 | 9.193 | 184 | 98 | 0 |
| 8 | Hapi on bun | 11,031 | 95% | 5.7 | 9.326 | 204 | 99 | 0 |
| 9 | NestJS (Express) on bun | 10,735 | 92% | 5.844 | 9.551 | 235 | 99 | 0 |
| 10 | NestJS (Fastify) on bun | 10,680 | 92% | 5.852 | 9.518 | 228 | 98 | 0 |
| 11 | node:http (baseline) on bun | 9,991 | 86% | 6.341 | 10.345 | 133 | 99 | 0 |
| 12 | h3 on deno | 9,152 | 79% | 7.366 | 10.582 | 212 | 102 | 0 |
| 13 | Fastify on deno | 8,801 | 76% | 7.317 | 10.959 | 222 | 103 | 0 |
| 14 | Hono on deno | 8,746 | 75% | 7.758 | 10.924 | 203 | 100 | 0 |
| 15 | HyperExpress on node | 8,721 | 75% | 7.32 | 10.706 | 196 | 100 | 0 |
| 16 | uWebSockets.js on node | 8,675 | 74% | 7.338 | 10.748 | 184 | 100 | 0 |
| 17 | Koa on deno | 8,666 | 74% | 7.427 | 11.065 | 237 | 104 | 0 |
| 18 | NestJS (Fastify) on deno | 8,608 | 74% | 7.472 | 10.979 | 290 | 104 | 0 |
| 19 | Elysia on deno | 8,582 | 74% | 7.841 | 11.469 | 187 | 100 | 0 |
| 20 | Deno.serve (baseline) on deno | 8,534 | 73% | 8.002 | 11.036 | 192 | 100 | 0 |
| 21 | Hono on node | 8,504 | 73% | 7.571 | 10.706 | 219 | 100 | 0 |
| 22 | Fastify on node | 8,399 | 72% | 7.606 | 11.242 | 218 | 101 | 0 |
| 23 | Express 5 on deno | 8,383 | 72% | 7.608 | 11.469 | 230 | 104 | 0 |
| 24 | Hapi on deno | 8,320 | 71% | 7.674 | 12.448 | 244 | 111 | 0 |
| 25 | h3 on node | 8,282 | 71% | 7.667 | 11.607 | 205 | 100 | 0 |
| 26 | Express 5 on node | 8,266 | 71% | 7.749 | 11.385 | 219 | 100 | 0 |
| 27 | Koa on node | 8,264 | 71% | 7.739 | 11.617 | 213 | 101 | 0 |
| 28 | NestJS (Fastify) on node | 8,264 | 71% | 7.783 | 11.342 | 273 | 101 | 0 |
| 29 | Elysia on node | 8,247 | 71% | 7.7 | 12.154 | 239 | 103 | 0 |
| 30 | Hapi on node | 8,211 | 70% | 7.775 | 11.764 | 247 | 102 | 0 |
| 31 | NestJS (Express) on deno | 8,189 | 70% | 7.789 | 11.393 | 270 | 105 | 0 |
| 32 | NestJS (Express) on node | 8,159 | 70% | 7.854 | 11.619 | 270 | 101 | 0 |
| 33 | node:http (baseline) on deno | 7,996 | 69% | 8.127 | 11.483 | 210 | 102 | 0 |
| 34 | node:http (baseline) on node | 7,151 | 61% | 8.801 | 13.986 | 207 | 100 | 0 |

## PATCH /users/:id (validate + UPDATE)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Elysia on bun | 12,437 | 100% | 5.079 | 8.07 | 119 | 98 | 0 |
| 2 | Hono on bun | 12,319 | 99% | 5.14 | 8.194 | 117 | 99 | 0 |
| 3 | h3 on bun | 12,186 | 98% | 5.158 | 8.134 | 114 | 98 | 0 |
| 4 | Fastify on bun | 12,178 | 98% | 5.172 | 8.424 | 170 | 99 | 0 |
| 5 | NestJS (Fastify) on bun | 11,755 | 95% | 5.347 | 8.712 | 218 | 99 | 0 |
| 6 | Koa on bun | 11,747 | 94% | 5.371 | 8.613 | 166 | 99 | 0 |
| 7 | Express 5 on bun | 11,715 | 94% | 5.386 | 8.699 | 166 | 99 | 0 |
| 8 | Bun.serve (baseline) on bun | 11,694 | 94% | 5.4 | 8.557 | 108 | 98 | 0 |
| 9 | Hapi on bun | 11,516 | 93% | 5.471 | 8.893 | 177 | 99 | 0 |
| 10 | NestJS (Express) on bun | 11,456 | 92% | 5.488 | 8.872 | 211 | 99 | 0 |
| 11 | node:http (baseline) on bun | 10,213 | 82% | 6.151 | 9.864 | 129 | 100 | 0 |
| 12 | Hono on deno | 9,083 | 73% | 7.412 | 10.387 | 187 | 100 | 0 |
| 13 | Fastify on deno | 9,000 | 72% | 7.102 | 11.216 | 222 | 106 | 0 |
| 14 | Elysia on deno | 8,914 | 72% | 7.555 | 10.678 | 205 | 101 | 0 |
| 15 | NestJS (Fastify) on deno | 8,866 | 71% | 7.263 | 10.461 | 287 | 104 | 0 |
| 16 | Koa on deno | 8,795 | 71% | 7.306 | 10.967 | 234 | 105 | 0 |
| 17 | Deno.serve (baseline) on deno | 8,742 | 70% | 7.674 | 10.953 | 192 | 103 | 0 |
| 18 | Hono on node | 8,704 | 70% | 7.347 | 10.681 | 216 | 101 | 0 |
| 19 | Fastify on node | 8,695 | 70% | 7.363 | 10.727 | 200 | 101 | 0 |
| 20 | h3 on deno | 8,671 | 70% | 7.811 | 10.809 | 210 | 103 | 0 |
| 21 | Koa on node | 8,657 | 70% | 7.4 | 10.671 | 215 | 101 | 0 |
| 22 | uWebSockets.js on node | 8,622 | 69% | 7.391 | 10.953 | 203 | 103 | 0 |
| 23 | HyperExpress on node | 8,611 | 69% | 7.432 | 11.013 | 205 | 103 | 0 |
| 24 | Express 5 on deno | 8,574 | 69% | 7.442 | 11.137 | 227 | 105 | 0 |
| 25 | NestJS (Fastify) on node | 8,566 | 69% | 7.483 | 10.68 | 268 | 101 | 0 |
| 26 | Elysia on node | 8,549 | 69% | 7.426 | 11.431 | 245 | 104 | 0 |
| 27 | Hapi on deno | 8,546 | 69% | 7.383 | 12.245 | 233 | 114 | 0 |
| 28 | NestJS (Express) on deno | 8,541 | 69% | 7.458 | 11.03 | 291 | 106 | 0 |
| 29 | Express 5 on node | 8,422 | 68% | 7.58 | 11.146 | 197 | 101 | 0 |
| 30 | h3 on node | 8,415 | 68% | 7.593 | 11.31 | 220 | 104 | 0 |
| 31 | NestJS (Express) on node | 8,391 | 67% | 7.608 | 11.351 | 267 | 102 | 0 |
| 32 | node:http (baseline) on deno | 8,386 | 67% | 7.648 | 10.934 | 204 | 103 | 0 |
| 33 | Hapi on node | 8,356 | 67% | 7.642 | 11.686 | 242 | 103 | 0 |
| 34 | node:http (baseline) on node | 8,149 | 66% | 7.884 | 11.271 | 202 | 101 | 0 |

## GET /me/feed (request-id, logger, CORS, JWT, query)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | h3 on bun | 11,935 | 100% | 5.302 | 8.322 | 126 | 111 | 0 |
| 2 | Elysia on bun | 11,547 | 97% | 5.493 | 8.42 | 127 | 110 | 0 |
| 3 | Fastify on bun | 11,304 | 95% | 5.612 | 8.727 | 184 | 111 | 0 |
| 4 | Hono on bun | 11,148 | 93% | 5.71 | 8.903 | 126 | 111 | 0 |
| 5 | NestJS (Fastify) on bun | 11,112 | 93% | 5.679 | 9.104 | 213 | 111 | 0 |
| 6 | Bun.serve (baseline) on bun | 11,061 | 93% | 5.726 | 8.846 | 122 | 111 | 0 |
| 7 | Express 5 on bun | 10,983 | 92% | 5.756 | 9.044 | 158 | 110 | 0 |
| 8 | Koa on bun | 10,974 | 92% | 5.767 | 9.049 | 181 | 111 | 0 |
| 9 | NestJS (Express) on bun | 10,931 | 92% | 5.776 | 9.158 | 206 | 110 | 0 |
| 10 | Hapi on bun | 10,867 | 91% | 5.82 | 9.304 | 197 | 111 | 0 |
| 11 | node:http (baseline) on bun | 9,468 | 79% | 6.7 | 10.509 | 143 | 112 | 0 |
| 12 | uWebSockets.js on node | 8,439 | 71% | 7.559 | 11.523 | 203 | 107 | 0 |
| 13 | Elysia on node | 8,305 | 70% | 7.697 | 11.619 | 219 | 103 | 0 |
| 14 | HyperExpress on node | 8,267 | 69% | 7.705 | 11.73 | 203 | 106 | 0 |
| 15 | Koa on node | 8,236 | 69% | 7.755 | 11.731 | 231 | 102 | 0 |
| 16 | Fastify on deno | 8,202 | 69% | 8.018 | 11.55 | 268 | 111 | 0 |
| 17 | Fastify on node | 8,184 | 69% | 7.798 | 11.903 | 234 | 106 | 0 |
| 18 | Hapi on node | 8,105 | 68% | 7.891 | 11.844 | 209 | 102 | 0 |
| 19 | NestJS (Fastify) on deno | 8,066 | 68% | 8.126 | 11.724 | 328 | 112 | 0 |
| 20 | Express 5 on node | 8,015 | 67% | 7.956 | 11.958 | 219 | 101 | 0 |
| 21 | h3 on node | 8,013 | 67% | 7.987 | 11.918 | 214 | 102 | 0 |
| 22 | NestJS (Fastify) on node | 8,011 | 67% | 7.945 | 11.926 | 271 | 102 | 0 |
| 23 | Elysia on deno | 7,994 | 67% | 8.006 | 11.523 | 312 | 108 | 0 |
| 24 | Koa on deno | 7,915 | 66% | 8.251 | 11.839 | 268 | 111 | 0 |
| 25 | Deno.serve (baseline) on deno | 7,859 | 66% | 8.126 | 11.676 | 308 | 107 | 0 |
| 26 | Hono on deno | 7,808 | 65% | 8.126 | 11.84 | 282 | 109 | 0 |
| 27 | Hapi on deno | 7,783 | 65% | 8.336 | 12.748 | 251 | 117 | 0 |
| 28 | h3 on deno | 7,765 | 65% | 8.211 | 12.516 | 289 | 110 | 0 |
| 29 | Express 5 on deno | 7,732 | 65% | 8.535 | 12.411 | 253 | 112 | 0 |
| 30 | NestJS (Express) on deno | 7,694 | 64% | 8.543 | 12.273 | 294 | 112 | 0 |
| 31 | Hono on node | 7,676 | 64% | 8.295 | 12.597 | 217 | 101 | 0 |
| 32 | NestJS (Express) on node | 7,654 | 64% | 8.309 | 12.914 | 268 | 102 | 0 |
| 33 | node:http (baseline) on node | 7,639 | 64% | 8.356 | 12.67 | 212 | 106 | 0 |
| 34 | node:http (baseline) on deno | 7,422 | 62% | 8.854 | 13.217 | 230 | 114 | 0 |

## GET /cache/posts/:id (Redis cache-aside)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | uWebSockets.js on node | 63,538 | 100% | 0.991 | 1.45 | 161 | 94 | 0 |
| 2 | HyperExpress on node | 53,215 | 84% | 1.147 | 1.762 | 166 | 95 | 0 |
| 3 | h3 on bun | 47,332 | 74% | 1.276 | 2.248 | 104 | 97 | 0 |
| 4 | Elysia on bun | 45,962 | 72% | 1.331 | 2.269 | 109 | 97 | 0 |
| 5 | Bun.serve (baseline) on bun | 43,525 | 69% | 1.408 | 2.414 | 100 | 97 | 0 |
| 6 | Hono on bun | 43,021 | 68% | 1.398 | 2.516 | 111 | 98 | 0 |
| 7 | h3 on deno | 41,905 | 66% | 1.421 | 2.646 | 184 | 100 | 0 |
| 8 | Fastify on bun | 40,542 | 64% | 1.488 | 2.548 | 159 | 98 | 0 |
| 9 | Fastify on node | 39,336 | 62% | 1.516 | 2.296 | 172 | 98 | 0 |
| 10 | Elysia on deno | 39,261 | 62% | 1.551 | 2.319 | 160 | 95 | 0 |
| 11 | Deno.serve (baseline) on deno | 38,864 | 61% | 1.573 | 2.322 | 155 | 95 | 0 |
| 12 | NestJS (Fastify) on bun | 38,450 | 61% | 1.545 | 2.787 | 187 | 100 | 0 |
| 13 | Hono on node | 37,602 | 59% | 1.582 | 2.574 | 180 | 98 | 0 |
| 14 | h3 on node | 37,430 | 59% | 1.594 | 2.505 | 207 | 99 | 0 |
| 15 | Koa on bun | 37,122 | 58% | 1.594 | 2.889 | 150 | 101 | 0 |
| 16 | Hono on deno | 36,885 | 58% | 1.641 | 2.458 | 157 | 95 | 0 |
| 17 | Elysia on node | 36,844 | 58% | 1.639 | 2.588 | 182 | 97 | 0 |
| 18 | Express 5 on bun | 36,485 | 57% | 1.64 | 2.827 | 148 | 101 | 0 |
| 19 | NestJS (Fastify) on deno | 36,409 | 57% | 1.67 | 2.92 | 255 | 110 | 0 |
| 20 | NestJS (Fastify) on node | 36,335 | 57% | 1.638 | 2.632 | 212 | 98 | 0 |
| 21 | Koa on node | 36,254 | 57% | 1.64 | 2.546 | 193 | 99 | 0 |
| 22 | NestJS (Express) on bun | 34,973 | 55% | 1.699 | 3.005 | 185 | 101 | 0 |
| 23 | Hapi on bun | 34,670 | 55% | 1.691 | 3.018 | 170 | 102 | 0 |
| 24 | Fastify on deno | 34,235 | 54% | 1.752 | 3.362 | 197 | 109 | 0 |
| 25 | Koa on deno | 32,215 | 51% | 1.885 | 3.478 | 204 | 112 | 0 |
| 26 | Hapi on node | 31,445 | 49% | 1.883 | 2.923 | 219 | 99 | 0 |
| 27 | Express 5 on node | 30,352 | 48% | 1.988 | 2.966 | 173 | 99 | 0 |
| 28 | node:http (baseline) on node | 30,200 | 48% | 1.976 | 3.154 | 171 | 98 | 0 |
| 29 | Hapi on deno | 29,358 | 46% | 1.97 | 4.753 | 213 | 128 | 0 |
| 30 | node:http (baseline) on deno | 28,117 | 44% | 2.165 | 3.675 | 182 | 102 | 0 |
| 31 | NestJS (Express) on node | 27,869 | 44% | 2.162 | 3.209 | 250 | 100 | 0 |
| 32 | node:http (baseline) on bun | 27,495 | 43% | 2.25 | 3.944 | 122 | 101 | 0 |
| 33 | NestJS (Express) on deno | 26,179 | 41% | 2.309 | 4.054 | 240 | 114 | 0 |
| 34 | Express 5 on deno | 25,191 | 40% | 2.426 | 4.486 | 202 | 113 | 0 |

## GET /large-json (~100KB serialize)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Hono on bun | 4,259 | 100% | 14.734 | 29.211 | 122 | 112 | 0 |
| 2 | Elysia on bun | 4,257 | 100% | 14.726 | 29.222 | 93 | 108 | 0 |
| 3 | h3 on bun | 4,219 | 99% | 14.86 | 29.522 | 116 | 112 | 0 |
| 4 | NestJS (Fastify) on bun | 4,126 | 97% | 15.317 | 20.77 | 243 | 103 | 0 |
| 5 | Koa on bun | 4,059 | 95% | 15.441 | 30.351 | 277 | 104 | 0 |
| 6 | Fastify on bun | 3,977 | 93% | 15.741 | 31.142 | 191 | 105 | 0 |
| 7 | Bun.serve (baseline) on bun | 3,855 | 91% | 16.315 | 32.306 | 79 | 109 | 0 |
| 8 | node:http (baseline) on bun | 3,232 | 76% | 19.514 | 38.386 | 143 | 107 | 0 |
| 9 | NestJS (Express) on bun | 3,000 | 70% | 20.855 | 41.355 | 239 | 105 | 0 |
| 10 | Express 5 on bun | 2,978 | 70% | 21.014 | 41.718 | 193 | 107 | 0 |
| 11 | Hapi on bun | 2,789 | 65% | 21.463 | 40.631 | 533 | 292 | 0 |
| 12 | Hono on deno | 2,697 | 63% | 23.78 | 24.919 | 199 | 100 | 0 |
| 13 | HyperExpress on node | 2,605 | 61% | 24.154 | 48.215 | 169 | 100 | 0 |
| 14 | uWebSockets.js on node | 2,532 | 59% | 24.874 | 49.654 | 162 | 100 | 0 |
| 15 | Elysia on deno | 2,490 | 58% | 25.799 | 27.139 | 192 | 100 | 0 |
| 16 | Deno.serve (baseline) on deno | 2,489 | 58% | 25.653 | 26.874 | 177 | 100 | 0 |
| 17 | Hono on node | 2,462 | 58% | 25.561 | 50.885 | 215 | 101 | 0 |
| 18 | Elysia on node | 2,449 | 58% | 25.676 | 51.162 | 241 | 101 | 0 |
| 19 | NestJS (Fastify) on node | 2,440 | 57% | 25.774 | 51.394 | 309 | 101 | 0 |
| 20 | NestJS (Fastify) on deno | 2,401 | 56% | 26.72 | 28.867 | 406 | 112 | 0 |
| 21 | Fastify on node | 2,364 | 56% | 26.575 | 52.859 | 208 | 101 | 0 |
| 22 | Fastify on deno | 2,357 | 55% | 27.081 | 29.199 | 369 | 112 | 0 |
| 23 | h3 on node | 2,352 | 55% | 26.738 | 53.097 | 260 | 101 | 0 |
| 24 | Koa on node | 2,340 | 55% | 26.838 | 53.516 | 229 | 101 | 0 |
| 25 | Koa on deno | 2,249 | 53% | 28.294 | 32.971 | 349 | 111 | 0 |
| 26 | node:http (baseline) on deno | 2,087 | 49% | 30.179 | 46.008 | 408 | 103 | 0 |
| 27 | Express 5 on node | 2,074 | 49% | 30.483 | 60.499 | 223 | 101 | 0 |
| 28 | node:http (baseline) on node | 2,043 | 48% | 30.743 | 61.206 | 212 | 100 | 0 |
| 29 | NestJS (Express) on node | 2,042 | 48% | 30.829 | 61.566 | 234 | 101 | 0 |
| 30 | Hapi on node | 1,545 | 36% | 39.58 | 61.579 | 439 | 272 | 0 |
| 31 | h3 on deno | 1,414 | 33% | 45.107 | 51.636 | 233 | 101 | 0 |
| 32 | Express 5 on deno | 948 | 22% | 66.474 | 76.278 | 352 | 104 | 0 |
| 33 | NestJS (Express) on deno | 947 | 22% | 67.389 | 77.138 | 347 | 105 | 0 |
| 34 | Hapi on deno | 795 | 19% | 79.418 | 148.825 | 537 | 112 | 0 |

## POST /bulk (parse + validate ~100KB)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Bun.serve (baseline) on bun | 7,125 | 100% | 8.754 | 17.45 | 90 | 110 | 0 |
| 2 | h3 on bun | 7,116 | 100% | 8.795 | 17.489 | 110 | 111 | 0 |
| 3 | Koa on bun | 6,484 | 91% | 9.615 | 19.087 | 190 | 110 | 0 |
| 4 | Express 5 on bun | 6,446 | 90% | 9.655 | 19.113 | 181 | 112 | 0 |
| 5 | Deno.serve (baseline) on deno | 6,263 | 88% | 10.208 | 10.984 | 179 | 100 | 0 |
| 6 | Hapi on bun | 6,145 | 86% | 10.141 | 20.078 | 209 | 109 | 0 |
| 7 | Fastify on bun | 6,088 | 85% | 10.275 | 20.376 | 187 | 105 | 0 |
| 8 | Hono on bun | 6,005 | 84% | 10.414 | 20.64 | 109 | 113 | 0 |
| 9 | h3 on deno | 5,735 | 80% | 10.781 | 15.813 | 309 | 113 | 0 |
| 10 | Elysia on bun | 5,460 | 77% | 11.496 | 22.808 | 110 | 103 | 0 |
| 11 | node:http (baseline) on bun | 5,309 | 75% | 11.954 | 14.374 | 161 | 114 | 0 |
| 12 | HyperExpress on node | 5,267 | 74% | 12.061 | 13.065 | 286 | 100 | 0 |
| 13 | uWebSockets.js on node | 5,182 | 73% | 12.147 | 21.482 | 216 | 104 | 0 |
| 14 | h3 on node | 5,042 | 71% | 12.59 | 13.919 | 245 | 101 | 0 |
| 15 | Koa on node | 5,024 | 71% | 12.548 | 24.805 | 179 | 101 | 0 |
| 16 | Express 5 on node | 5,014 | 70% | 12.539 | 24.78 | 240 | 101 | 0 |
| 17 | Koa on deno | 4,667 | 65% | 14.157 | 17.933 | 354 | 110 | 0 |
| 18 | node:http (baseline) on deno | 4,659 | 65% | 12.827 | 22.015 | 264 | 106 | 0 |
| 19 | Hono on deno | 4,651 | 65% | 13.731 | 14.66 | 188 | 100 | 0 |
| 20 | node:http (baseline) on node | 4,510 | 63% | 14.105 | 16.587 | 176 | 101 | 0 |
| 21 | Hapi on node | 4,383 | 62% | 13.752 | 23.276 | 318 | 121 | 0 |
| 22 | Express 5 on deno | 4,029 | 57% | 15.603 | 20.459 | 350 | 132 | 0 |
| 23 | Hono on node | 3,747 | 53% | 16.88 | 33.284 | 184 | 101 | 0 |
| 24 | Hapi on deno | 3,569 | 50% | 17.654 | 31.765 | 376 | 160 | 0 |
| 25 | Fastify on deno | 3,456 | 49% | 18.571 | 22.329 | 260 | 103 | 0 |
| 26 | Fastify on node | 3,345 | 47% | 18.903 | 37.331 | 213 | 100 | 0 |
| 27 | Elysia on deno | 3,024 | 42% | 21.107 | 23.971 | 315 | 101 | 0 |
| 28 | Elysia on node | 2,680 | 38% | 23.567 | 46.533 | 372 | 102 | 0 |
| 29 | NestJS (Express) on node | 797 | 11% | 78.155 | 156.201 | 570 | 103 | 0 |
| 30 | NestJS (Fastify) on node | 784 | 11% | 80.139 | 160.612 | 196 | 102 | 0 |
| 31 | NestJS (Express) on deno | 650 | 9% | 101.103 | 186.927 | 651 | 148 | 0 |
| 32 | NestJS (Fastify) on deno | 605 | 8% | 103.459 | 204.805 | 610 | 144 | 0 |
| 33 | NestJS (Express) on bun | 510 | 7% | 123.883 | 242.594 | 244 | 112 | 0 |
| 34 | NestJS (Fastify) on bun | 493 | 7% | 128.547 | 253.593 | 244 | 113 | 0 |

## POST /auth/login (scrypt + JWT sign)

Higher RPS is better.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | h3 on bun | 968 | 100% | 58.844 | 185.89 | 159 | 720 | 0 |
| 2 | Hono on bun | 871 | 90% | 64.699 | 210.284 | 150 | 723 | 0 |
| 3 | NestJS (Fastify) on bun | 860 | 89% | 66.214 | 206.872 | 240 | 725 | 0 |
| 4 | Fastify on bun | 853 | 88% | 66.915 | 208.939 | 189 | 726 | 0 |
| 5 | Elysia on bun | 847 | 87% | 66.253 | 215.231 | 189 | 722 | 0 |
| 6 | NestJS (Express) on bun | 845 | 87% | 67.243 | 213.948 | 256 | 728 | 0 |
| 7 | Koa on bun | 843 | 87% | 67.235 | 219.001 | 198 | 726 | 0 |
| 8 | Hapi on bun | 833 | 86% | 68.216 | 215.96 | 225 | 724 | 0 |
| 9 | Express 5 on bun | 816 | 84% | 69.429 | 223.398 | 202 | 725 | 0 |
| 10 | Bun.serve (baseline) on bun | 761 | 79% | 74.605 | 237.955 | 160 | 722 | 0 |
| 11 | h3 on deno | 728 | 75% | 89.337 | 166.181 | 328 | 743 | 0 |
| 12 | node:http (baseline) on bun | 652 | 67% | 86.798 | 284.334 | 181 | 733 | 0 |
| 13 | Hono on deno | 608 | 63% | 106.754 | 176.697 | 322 | 746 | 0 |
| 14 | Koa on deno | 603 | 62% | 108.215 | 183.01 | 348 | 748 | 0 |
| 15 | Hapi on deno | 601 | 62% | 108.358 | 184.997 | 353 | 747 | 0 |
| 16 | NestJS (Fastify) on deno | 598 | 62% | 108.65 | 181.888 | 377 | 746 | 0 |
| 17 | Elysia on deno | 579 | 60% | 113.178 | 185.771 | 331 | 745 | 0 |
| 18 | Fastify on deno | 578 | 60% | 111.882 | 187.575 | 349 | 747 | 0 |
| 19 | Deno.serve (baseline) on deno | 570 | 59% | 114.894 | 187.413 | 296 | 747 | 0 |
| 20 | Express 5 on deno | 565 | 58% | 115.302 | 190.107 | 351 | 748 | 0 |
| 21 | uWebSockets.js on node | 550 | 57% | 114.362 | 151.907 | 169 | 412 | 0 |
| 22 | HyperExpress on node | 549 | 57% | 114.67 | 145.847 | 192 | 412 | 0 |
| 23 | Elysia on node | 546 | 56% | 115.92 | 156.487 | 224 | 410 | 0 |
| 24 | NestJS (Express) on deno | 538 | 56% | 119.931 | 204.602 | 408 | 748 | 0 |
| 25 | node:http (baseline) on deno | 512 | 53% | 128.596 | 206.911 | 327 | 747 | 0 |
| 26 | Fastify on node | 509 | 53% | 125.17 | 161.66 | 179 | 413 | 0 |
| 27 | NestJS (Fastify) on node | 480 | 50% | 132.577 | 160.409 | 203 | 416 | 0 |
| 28 | Hapi on node | 476 | 49% | 133.634 | 170.724 | 200 | 414 | 0 |
| 29 | Koa on node | 475 | 49% | 133.088 | 168.86 | 183 | 412 | 0 |
| 30 | NestJS (Express) on node | 474 | 49% | 134.122 | 159.864 | 256 | 412 | 0 |
| 31 | Hono on node | 470 | 49% | 133.933 | 177.261 | 182 | 413 | 0 |
| 32 | Express 5 on node | 458 | 47% | 138.255 | 174.114 | 181 | 414 | 0 |
| 33 | h3 on node | 455 | 47% | 138.585 | 182.147 | 178 | 413 | 0 |
| 34 | node:http (baseline) on node | 384 | 40% | 167.287 | 212.824 | 175 | 406 | 0 |

## Mixed traffic at fixed rate (k6)

Lower p99 is better. Throughput is fixed by the load generator.

| # | Combo | RPS | vs best | p50 ms | p99 ms | RSS MB | CPU % | Non-2xx / errors |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | node:http (baseline) on bun | 1,500 | 100% | 0.329 | 6.931 | 156 | 58 | 0 |
| 2 | h3 on bun | 1,500 | 100% | 0.339 | 6.946 | 149 | 58 | 0 |
| 3 | Bun.serve (baseline) on bun | 1,500 | 100% | 0.335 | 6.961 | 136 | 58 | 0 |
| 4 | Fastify on bun | 1,500 | 99% | 0.336 | 6.972 | 181 | 59 | 0 |
| 5 | Hono on bun | 1,500 | 99% | 0.339 | 6.973 | 138 | 59 | 0 |
| 6 | Elysia on bun | 1,500 | 99% | 0.335 | 6.975 | 155 | 58 | 0 |
| 7 | Express 5 on bun | 1,500 | 99% | 0.347 | 6.996 | 169 | 60 | 0 |
| 8 | Koa on bun | 1,500 | 99% | 0.345 | 7.009 | 204 | 59 | 0 |
| 9 | NestJS (Express) on bun | 1,500 | 99% | 0.354 | 7.026 | 231 | 61 | 0 |
| 10 | NestJS (Fastify) on bun | 1,500 | 99% | 0.348 | 7.034 | 218 | 60 | 0 |
| 11 | Hapi on bun | 1,500 | 98% | 0.348 | 7.045 | 197 | 61 | 0 |
| 12 | uWebSockets.js on node | 1,500 | 83% | 0.344 | 8.364 | 165 | 70 | 0 |
| 13 | Fastify on node | 1,500 | 83% | 0.354 | 8.377 | 175 | 72 | 0 |
| 14 | h3 on node | 1,500 | 83% | 0.358 | 8.378 | 177 | 72 | 0 |
| 15 | HyperExpress on node | 1,500 | 83% | 0.349 | 8.397 | 168 | 71 | 0 |
| 16 | Elysia on node | 1,500 | 82% | 0.361 | 8.403 | 204 | 72 | 0 |
| 17 | Hono on node | 1,500 | 82% | 0.356 | 8.41 | 183 | 73 | 0 |
| 18 | NestJS (Fastify) on node | 1,500 | 82% | 0.363 | 8.411 | 266 | 73 | 0 |
| 19 | Express 5 on node | 1,500 | 82% | 0.368 | 8.427 | 178 | 74 | 0 |
| 20 | Koa on node | 1,500 | 82% | 0.361 | 8.439 | 195 | 74 | 0 |
| 21 | Hapi on node | 1,500 | 82% | 0.371 | 8.44 | 198 | 74 | 0 |
| 22 | NestJS (Express) on node | 1,500 | 82% | 0.379 | 8.469 | 261 | 75 | 0 |
| 23 | node:http (baseline) on node | 1,500 | 81% | 0.347 | 8.552 | 179 | 73 | 0 |
| 24 | Hono on deno | 1,500 | 77% | 0.359 | 8.971 | 183 | 77 | 0 |
| 25 | Deno.serve (baseline) on deno | 1,500 | 77% | 0.353 | 8.984 | 178 | 76 | 0 |
| 26 | h3 on deno | 1,500 | 77% | 0.364 | 8.993 | 178 | 77 | 0 |
| 27 | Elysia on deno | 1,500 | 77% | 0.363 | 8.999 | 171 | 78 | 0 |
| 28 | node:http (baseline) on deno | 1,500 | 77% | 0.361 | 8.999 | 187 | 79 | 0 |
| 29 | Fastify on deno | 1,500 | 77% | 0.364 | 9.012 | 187 | 77 | 0 |
| 30 | Express 5 on deno | 1,500 | 77% | 0.378 | 9.033 | 195 | 80 | 0 |
| 31 | NestJS (Fastify) on deno | 1,500 | 77% | 0.378 | 9.048 | 249 | 81 | 0 |
| 32 | Koa on deno | 1,500 | 76% | 0.377 | 9.063 | 235 | 81 | 0 |
| 33 | NestJS (Express) on deno | 1,500 | 76% | 0.393 | 9.1 | 230 | 82 | 0 |
| 34 | Hapi on deno | 1,500 | 76% | 0.387 | 9.109 | 244 | 83 | 0 |

## Not available / failed

- **uws@bun**: process exited early:       at /Users/ninggiangboy/Develops/side-project/benchmark/dist/apps/uws/main.js:57:42 |  | Bun v1.4.3 (macOS arm64)
- **hyper-express@bun**: process exited early:       at <anonymous> (/Users/ninggiangboy/Develops/side-project/benchmark/node_modules/hyper-express/index.js:4:7) |  | Bun v1.4.3 (macOS 
