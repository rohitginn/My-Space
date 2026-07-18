ALTER TABLE "habits" ADD COLUMN "routine_id" uuid;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "purpose" text;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "duration_type" varchar(20) DEFAULT 'weeks';--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "duration_value" integer DEFAULT 4;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "is_active" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "routines" ADD COLUMN "start_date" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "habits" ADD CONSTRAINT "habits_routine_id_routines_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routines"("id") ON DELETE set null ON UPDATE no action;