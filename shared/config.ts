export const config = {
  port: Number(process.env.PORT ?? 3000),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://bench:bench@127.0.0.1:5432/bench",
  redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
  jwtSecret: process.env.JWT_SECRET ?? "bench-secret-bench-secret-bench-secret",
  dbPoolSize: Number(process.env.DB_POOL ?? 20),
};
