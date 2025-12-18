import "dotenv/config";
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from "@shared/schema";

// Lazy initialization to avoid errors during module load
let client: ReturnType<typeof postgres> | null = null;
let dbInstance: ReturnType<typeof drizzle> | null = null;

function getClient() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  if (!client) {
    client = postgres(process.env.DATABASE_URL);
  }
  
  return client;
}

export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    if (!dbInstance) {
      dbInstance = drizzle(getClient(), { schema });
    }
    return (dbInstance as any)[prop];
  }
});

// For session store compatibility (connect-pg-simple requires a Pool-like interface)
// Supabase uses standard PostgreSQL connection string
export const pool = {
  query: async (text: string, params?: unknown[]) => {
    const result = await getClient().unsafe(text, params as never[]);
    return { rows: result };
  },
  end: () => {
    if (client) {
      client.end();
      client = null;
      dbInstance = null;
    }
  },
};
