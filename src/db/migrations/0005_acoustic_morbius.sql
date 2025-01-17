CREATE TABLE "test_table" (
	"public_text" text,
	"secret_text" text,
	"encrypted_secret_text" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"is_synced" boolean DEFAULT false NOT NULL,
	"sent_to_server" boolean DEFAULT false NOT NULL,
	"is_decrypted" boolean DEFAULT false NOT NULL,
	"session_id" text
);
