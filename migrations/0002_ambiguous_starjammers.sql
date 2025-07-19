CREATE TABLE "japanese_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"kanji" text,
	"reading" text NOT NULL,
	"frequency" integer NOT NULL,
	"part_of_speech" text NOT NULL,
	"is_priority" boolean DEFAULT false,
	"entry_id" integer,
	"file_count" integer DEFAULT 1
);
--> statement-breakpoint
CREATE INDEX "reading_idx" ON "japanese_tokens" USING btree ("reading");--> statement-breakpoint
CREATE INDEX "kanji_idx" ON "japanese_tokens" USING btree ("kanji");--> statement-breakpoint
CREATE INDEX "frequency_idx" ON "japanese_tokens" USING btree ("frequency");--> statement-breakpoint
CREATE INDEX "pos_idx" ON "japanese_tokens" USING btree ("part_of_speech");--> statement-breakpoint
CREATE INDEX "reading_kanji_idx" ON "japanese_tokens" USING btree ("reading","kanji");