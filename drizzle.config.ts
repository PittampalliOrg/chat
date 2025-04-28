import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

config({
  path: '.env',
});

const {
  CONNECTION_POSTGRESQL_HOST,
  CONNECTION_POSTGRESQL_PORT,
  CONNECTION_POSTGRESQL_DATABASE,
  CONNECTION_POSTGRESQL_USERNAME,
  CONNECTION_POSTGRESQL_PASSWORD,
} = process.env;

const url = `postgres://${CONNECTION_POSTGRESQL_USERNAME}:${CONNECTION_POSTGRESQL_PASSWORD}@${CONNECTION_POSTGRESQL_HOST}:${CONNECTION_POSTGRESQL_PORT}/${CONNECTION_POSTGRESQL_DATABASE}`;

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url,
  },
});
