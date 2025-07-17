UPDATE "malan-chatbot_messagesTable" SET "createdAt" = CURRENT_TIMESTAMP WHERE "createdAt" IS NULL;--> statement-breakpoint
ALTER TABLE "malan-chatbot_messagesTable" ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;--> statement-breakpoint
ALTER TABLE "malan-chatbot_messagesTable" ALTER COLUMN "createdAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "malan-chatbot_user-sessions-table" ADD COLUMN "lastMessageAt" timestamp with time zone;--> statement-breakpoint
CREATE INDEX "idx_definitions_word_pos" ON "definitions" USING btree ("word_id","pos");--> statement-breakpoint
CREATE INDEX "idx_messages_chat_created_asc" ON "malan-chatbot_messagesTable" USING btree ("chatId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_messages_chat_created_desc" ON "malan-chatbot_messagesTable" USING btree ("chatId","createdAt");--> statement-breakpoint
CREATE INDEX "idx_translations_def_lang" ON "translations" USING btree ("definition_id","target_lang");--> statement-breakpoint
CREATE INDEX "idx_user_session_user_pinned_created" ON "malan-chatbot_user-sessions-table" USING btree ("userId","isPinned","createdAt");--> statement-breakpoint
CREATE INDEX "idx_user_session_user_id" ON "malan-chatbot_user-sessions-table" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "idx_wordlist_user_lang_created" ON "wordlist" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_wordlist_user_word" ON "wordlist" USING btree ("user_id","word_id");--> statement-breakpoint
CREATE INDEX "idx_wordlist_join_optimization" ON "wordlist" USING btree ("user_id","word_id");--> statement-breakpoint
CREATE INDEX "idx_words_lang_word" ON "words" USING btree ("lang","word");--> statement-breakpoint
ALTER TABLE "user_preferences" DROP COLUMN "chinese_script";