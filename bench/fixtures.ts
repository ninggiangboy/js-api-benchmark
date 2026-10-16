import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { signToken } from "../shared/auth.js";
import { ROOT } from "./proc.js";

const dir = resolve(ROOT, "bench", "fixtures");

export interface Fixtures {
  usersNdjson: string;
  bulkJson: string;
  loginJson: string;
  patchJson: string;
  token: string;
}

/** Request bodies and the JWT used by the load generators. Generated once, reused afterwards. */
export async function ensureFixtures(): Promise<Fixtures> {
  mkdirSync(dir, { recursive: true });
  const f = {
    usersNdjson: resolve(dir, "users.ndjson"),
    bulkJson: resolve(dir, "bulk.json"),
    loginJson: resolve(dir, "login.json"),
    patchJson: resolve(dir, "patch.json"),
  };
  if (!existsSync(f.usersNdjson)) {
    const lines: string[] = [];
    for (let i = 0; i < 1_000_000; i++) lines.push(JSON.stringify({ email: `new${i}@bench.example.com`, name: `New User ${i}` }));
    writeFileSync(f.usersNdjson, lines.join("\n"));
  }
  if (!existsSync(f.bulkJson)) {
    const items = Array.from({ length: 500 }, (_, i) => ({ id: i, value: (i * 31) % 997 / 3, label: `label-${i}-`.padEnd(180, "x") }));
    writeFileSync(f.bulkJson, JSON.stringify({ items }));
  }
  writeFileSync(f.loginJson, JSON.stringify({ email: "user1@example.com", password: "password123" }));
  writeFileSync(f.patchJson, JSON.stringify({ name: "Patched Name" }));
  return { ...f, token: await signToken(1) };
}
