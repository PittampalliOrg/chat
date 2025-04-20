import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

if (!process.env.POSTGRES_URL) {
  throw new Error("POSTGRES_URL is undefined – check your Dapr secret store or .env");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.POSTGRES_URL },
});
