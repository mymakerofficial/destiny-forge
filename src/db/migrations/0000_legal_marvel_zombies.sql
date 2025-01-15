CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text,
	"created_at" timestamp DEFAULT 'now()',
	CONSTRAINT "name_not_empty" CHECK ("items"."name" <> '')
);
