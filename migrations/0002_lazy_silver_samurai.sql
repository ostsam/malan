ALTER TABLE "malan-chatbot_user-sessions-table" ADD COLUMN "slug" varchar(256) NOT NULL;--> statement-breakpoint
ALTER TABLE "malan-chatbot_user-sessions-table" ADD COLUMN "settings" jsonb NOT NULL;--> statement-breakpoint
CREATE INDEX "messages_chat_id_created_at_idx" ON "malan-chatbot_messagesTable" USING btree ("chatId","createdAt");