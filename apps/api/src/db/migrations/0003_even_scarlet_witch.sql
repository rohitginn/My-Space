ALTER TABLE "goals" ADD COLUMN "category" varchar(50) DEFAULT 'personal';--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "color" varchar(7) DEFAULT '#3b82f6';--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "milestones" text;