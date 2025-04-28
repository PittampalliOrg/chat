import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

const {
  CONNECTION_POSTGRESQL_HOST,
  CONNECTION_POSTGRESQL_PORT,
  CONNECTION_POSTGRESQL_DATABASE,
  CONNECTION_POSTGRESQL_USERNAME,
  CONNECTION_POSTGRESQL_PASSWORD,
  SSL
} = process.env;

const url = `postgres://${CONNECTION_POSTGRESQL_USERNAME}:${CONNECTION_POSTGRESQL_PASSWORD}@${CONNECTION_POSTGRESQL_HOST}:${CONNECTION_POSTGRESQL_PORT}/${CONNECTION_POSTGRESQL_DATABASE}`;

const client = postgres(url, {ssl: SSL === 'true' || SSL === '1'});
const db = drizzle(client);

const runMigrate = async () => {
  const { SSL } = process.env;
  const connection = postgres(url, {ssl: SSL === 'true' || SSL === '1'});
  const db = drizzle(connection);

  console.log('⏳ Running migrations...');

  const start = Date.now();
  await migrate(db, { migrationsFolder: './lib/db/migrations' });
  const end = Date.now();

  console.log('✅ Migrations completed in', end - start, 'ms');
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('❌ Migration failed');
  console.error(err);
  process.exit(1);
});
