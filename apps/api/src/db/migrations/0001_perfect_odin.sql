ALTER TABLE "inbox_items" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "journal_entries" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "inbox_items" CASCADE;--> statement-breakpoint
DROP TABLE "journal_entries" CASCADE;--> statement-breakpoint
ALTER TABLE "habits" DROP CONSTRAINT "habits_routine_id_routines_id_fk";
--> statement-breakpoint
ALTER TABLE "habits" DROP COLUMN "routine_id";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "routines" DROP COLUMN "purpose";--> statement-breakpoint
ALTER TABLE "routines" DROP COLUMN "duration_type";--> statement-breakpoint
ALTER TABLE "routines" DROP COLUMN "duration_value";--> statement-breakpoint
ALTER TABLE "routines" DROP COLUMN "is_active";--> statement-breakpoint
ALTER TABLE "routines" DROP COLUMN "start_date";