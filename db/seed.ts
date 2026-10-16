import { seed, counts } from "./lib.js";
import { sql } from "../shared/db.js";

await seed();
console.log("seeded", await counts());
await sql.end();
