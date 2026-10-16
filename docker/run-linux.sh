#!/usr/bin/env bash
# Rerun the benchmark inside the all-in-one image on a Linux host, pinning the server and the load generator
# to separate cores. Extra arguments go to the runner, e.g.:
#   docker/run-linux.sh --only hono,fastify --scenario json,user-get
#   SERVER_CPUS=0-1 LOADGEN_CPUS=2-3 DB_CPUS=4-7 docker/run-linux.sh --quick
set -euo pipefail
cd "$(dirname "$0")/.."

SERVER_CPUS=${SERVER_CPUS:-0-1}
LOADGEN_CPUS=${LOADGEN_CPUS:-2-3}
DB_CPUS=${DB_CPUS:-4-7}

docker build -f docker/bench.Dockerfile -t js-api-bench .
docker compose up -d
for id in $(docker compose ps -q); do docker update --cpuset-cpus "$DB_CPUS" "$id" >/dev/null; done
sleep 3

docker run --rm --network host \
  -e BENCH_SERVER_CPUS="$SERVER_CPUS" -e BENCH_LOADGEN_CPUS="$LOADGEN_CPUS" \
  -v "$PWD/results:/app/results" \
  js-api-bench dist/db/seed.js
docker run --rm --network host \
  -e BENCH_SERVER_CPUS="$SERVER_CPUS" -e BENCH_LOADGEN_CPUS="$LOADGEN_CPUS" \
  -v "$PWD/results:/app/results" \
  js-api-bench dist/bench/smoke.js
docker run --rm --network host \
  -e BENCH_SERVER_CPUS="$SERVER_CPUS" -e BENCH_LOADGEN_CPUS="$LOADGEN_CPUS" \
  -v "$PWD/results:/app/results" \
  js-api-bench dist/bench/run.js "$@"
