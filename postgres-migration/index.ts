// Produkcijski DB klient za Vercel Postgres / Neon.
// Ob deployu: preimenuj to datoteko v index.ts (staro SQLite verzijo v
// index.sqlite.ts) in namesti "pg": npm install pg && npm install -D @types/pg
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("localhost") ? false : { rejectUnauthorized: false },
});

export const db = drizzle(pool, { schema });
