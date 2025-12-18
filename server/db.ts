import "dotenv/config";
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

const client = postgres(process.env.DATABASE_URL);
export const db = drizzle(client, { schema });

// For session store compatibility (connect-pg-simple requires a Pool-like interface)
// Supabase uses standard PostgreSQL connection string
export const pool = {
  query: async (text: string, params?: unknown[]) => {
    const result = await client.unsafe(text, params as never[]);
    return { rows: result };
  },
  end: () => client.end(),
};
