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

  await sql`
    CREATE TABLE IF NOT EXISTS "workspaces" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "name" varchar(200) NOT NULL,
      "slug" varchar(100) NOT NULL UNIQUE,
      "description" text,
      "avatar_url" text,
      "owner_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "type" varchar(20) DEFAULT 'team' NOT NULL,
      "accent_color" varchar(7) DEFAULT '#0f766e' NOT NULL,
      "invite_code" varchar(20) NOT NULL UNIQUE,
      "max_members" integer DEFAULT 10 NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "workspace_members" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "role" varchar(20) DEFAULT 'member' NOT NULL,
      "joined_at" timestamp with time zone DEFAULT now() NOT NULL,
      CONSTRAINT "workspace_member_unique" UNIQUE("workspace_id", "user_id")
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "co_canvases" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
      "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
      "title" varchar(300) NOT NULL,
      "document_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
      "created_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "integration_oauth_states" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "state_hash" varchar(64) NOT NULL UNIQUE,
      "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
      "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "provider" varchar(30) NOT NULL,
      "expires_at" timestamp with time zone NOT NULL,
      "used_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS "workspace_integrations" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "workspace_id" uuid NOT NULL REFERENCES "workspaces"("id") ON DELETE CASCADE,
      "provider" varchar(30) NOT NULL,
      "status" varchar(20) DEFAULT 'connected' NOT NULL,
      "installed_by_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT,
      "external_account_id" varchar(255),
      "external_account_name" varchar(255),
      "access_token_encrypted" text NOT NULL,
      "refresh_token_encrypted" text,
      "token_expires_at" timestamp with time zone,
      "scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
      "metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
      "last_synced_at" timestamp with time zone,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      "updated_at" timestamp with time zone DEFAULT now() NOT NULL
    );
  `;

  await sql`
    CREATE UNIQUE INDEX IF NOT EXISTS "workspace_integrations_provider_unique"
    ON "workspace_integrations" ("workspace_id", "provider");
  `;

  console.log('Fixes applied successfully!');
  await sql.end();
  process.exit(0);
};

runMigrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
