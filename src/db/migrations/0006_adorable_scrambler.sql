ALTER TABLE "items" RENAME COLUMN "sent_to_server" TO "is_sent_to_server";--> statement-breakpoint
ALTER TABLE "test_table" RENAME COLUMN "sent_to_server" TO "is_sent_to_server";--> statement-breakpoint
ALTER TABLE "items" ADD COLUMN "is_new" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "test_table" ADD COLUMN "is_new" boolean DEFAULT true NOT NULL;