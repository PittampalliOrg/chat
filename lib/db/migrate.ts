import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { config } from 'dotenv';

config({ path: '.env' });

const postgresUrl = process.env.POSTGRES_URL;
if (!postgresUrl) {
  throw new Error('POSTGRES_URL environment variable is not set');
}
const sql = neon(postgresUrl);
const db = drizzle(sql);

const main = async () => {
  try {
    await migrate(db, { migrationsFolder: './lib/db/migrations' });
    console.log('Migration completed');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
};

main();
