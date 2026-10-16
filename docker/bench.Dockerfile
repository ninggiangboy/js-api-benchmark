# Everything needed to rerun the benchmark on a Linux host: Node, Bun, Deno, oha, k6 and this repo.
# Postgres and Redis come from docker-compose.yml; run this image with --network host so it can reach them.
FROM node:26 AS build
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json deno.json ./
COPY shared ./shared
COPY apps ./apps
COPY db ./db
COPY bench ./bench
RUN pnpm exec tsc -p tsconfig.json

FROM node:26
ARG TARGETARCH
ARG OHA_VERSION=1.16.0
ARG K6_VERSION=2.3.0
RUN apt-get update && apt-get install -y --no-install-recommends curl ca-certificates util-linux procps && rm -rf /var/lib/apt/lists/* \
 && npm i -g bun deno \
 && curl -fsSL -o /usr/local/bin/oha "https://github.com/hatoo/oha/releases/download/v${OHA_VERSION}/oha-linux-${TARGETARCH}" && chmod +x /usr/local/bin/oha \
 && curl -fsSL "https://github.com/grafana/k6/releases/download/v${K6_VERSION}/k6-v${K6_VERSION}-linux-${TARGETARCH}.tar.gz" | tar -xz --strip-components=1 -C /usr/local/bin "k6-v${K6_VERSION}-linux-${TARGETARCH}/k6"
WORKDIR /app
COPY --from=build /app /app
ENV NODE_ENV=production
ENTRYPOINT ["node"]
CMD ["dist/bench/run.js", "--quick"]
