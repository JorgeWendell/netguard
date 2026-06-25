import "dotenv/config";

import { drizzle } from "drizzle-orm/node-postgres";

import * as schema from "@/db/schema";

if (typeof window !== "undefined") {
  throw new Error("Database can only be used on the server");
}

export const db = drizzle(process.env.DATABASE_URL!, { schema });
