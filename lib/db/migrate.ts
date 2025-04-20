import { loadEnvConfig } from "@next/env";
import { initRuntime } from "@/lib/dapr/runtime";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// -----------------------------------------------------------------------------
// Load .env* files for local CLI usage (noop in Docker/CI when vars are already set)
// -----------------------------------------------------------------------------
loadEnvConfig(process.cwd());

(async () => {
  // Ensure secrets are loaded (Dapr) before connecting
  await initRuntime();

  const url = process.env.POSTGRES_URL;
  if (!url) {
    console.error("POSTGRES_URL is not defined – aborting migrations");
    process.exit(1);
  }

  const isProd = process.env.NODE_ENV === "production";
  const connection = postgres(url, { max: 1, ssl: isProd });
  const db = drizzle(connection);

  console.log("⏳ Running migrations...");
  const start = Date.now();
  await migrate(db, { migrationsFolder: "./lib/db/migrations" });
  const end = Date.now();
  console.log(`✅ Migrations completed in ${end - start} ms`);
  process.exit(0);
})().catch((err) => {
  console.error("❌ Migration failed");
  console.error(err);
  process.exit(1);
});
