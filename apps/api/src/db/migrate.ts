import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const runMigrate = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined');
  }

  console.log('Connecting to database...');
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  console.log('Applying manual schema fixes...');
  await sql`
    CREATE TABLE IF NOT EXISTS "drawings" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "name" text NOT NULL,
      "data" jsonb DEFAULT '{}',
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "badges" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" varchar(50) NOT NULL,
      "title" varchar(100) NOT NULL,
      "description" text NOT NULL,
      "icon_url" text NOT NULL,
      "unlocked_at" timestamp with time zone NOT NULL DEFAULT now()
    );
  `;

  await sql`
    ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" varchar(20) DEFAULT 'user' NOT NULL;
  `;

  console.log('Fixes applied successfully!');
  await sql.end();
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
