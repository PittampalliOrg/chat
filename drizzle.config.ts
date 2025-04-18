import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({
  path: '.env.local',
});

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    // biome-ignore lint: Forbidden non-null assertion.
    // url: process.env.POSTGRES_URL!,
    url: "postgresql://myadmin:postgres123!@qs-ygl2zollxkbc6.postgres.database.azure.com:5432/postgres?sslmode=require",
    ssl: true,
  },
});
