import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Allow build without DATABASE_URL (for Vercel build step)
// DATABASE_URL is only needed for actual database operations (db:push, migrations)
const databaseUrl = process.env.DATABASE_URL || "postgresql://placeholder";

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: databaseUrl,
  },
});
