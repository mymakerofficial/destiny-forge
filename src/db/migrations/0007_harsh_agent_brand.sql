DROP TABLE "test_table" CASCADE;--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "encrypted_name";--> statement-breakpoint
ALTER TABLE "items" DROP COLUMN "is_decrypted";