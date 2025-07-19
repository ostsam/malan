CREATE TABLE IF NOT EXISTS "japanese_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"kanji" text,
	"reading" text NOT NULL,
	"frequency" integer NOT NULL,
	"part_of_speech" text NOT NULL,
	"is_priority" boolean DEFAULT false,
	"entry_id" integer,
	"file_count" integer DEFAULT 1
);

-- Create indexes for efficient tokenization queries
CREATE INDEX IF NOT EXISTS "reading_idx" ON "japanese_tokens"("reading");
CREATE INDEX IF NOT EXISTS "kanji_idx" ON "japanese_tokens"("kanji");
CREATE INDEX IF NOT EXISTS "frequency_idx" ON "japanese_tokens"("frequency");
CREATE INDEX IF NOT EXISTS "pos_idx" ON "japanese_tokens"("part_of_speech");
CREATE INDEX IF NOT EXISTS "reading_kanji_idx" ON "japanese_tokens"("reading", "kanji"); 