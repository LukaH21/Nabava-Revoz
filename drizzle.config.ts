// Uporabi ob deployu na Vercel: preimenuj v drizzle.config.ts (staro v
// drizzle.config.sqlite.ts), nastavi DATABASE_URL na Postgres connection
// string, nato `npx drizzle-kit generate` in `npx drizzle-kit migrate`.
import type { Config } from "drizzle-kit";

export default {
  schema: "./src/db/schema.ts",
  out: "./drizzle-pg",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
} satisfies Config;
