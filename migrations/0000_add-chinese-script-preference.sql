CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "definitions" (
	"id" serial PRIMARY KEY NOT NULL,
	"word_id" integer NOT NULL,
	"pos" varchar(128) NOT NULL,
	"sense" text NOT NULL,
	"examples" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"source" varchar(16) DEFAULT 'wiki' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "malan-chatbot_messagesTable" (
	"messageId" varchar(256) PRIMARY KEY NOT NULL,
	"chatId" varchar(256) NOT NULL,
	"role" varchar(256),
	"createdAt" timestamp with time zone,
	"parts" jsonb NOT NULL,
	"content" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "translations" (
	"definition_id" integer NOT NULL,
	"target_lang" varchar(8) NOT NULL,
	"translated_sense" text NOT NULL,
	"source" varchar(16) DEFAULT 'ai' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "translations_definition_id_target_lang_pk" PRIMARY KEY("definition_id","target_lang")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"created_at" timestamp NOT NULL,
	"updated_at" timestamp NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "user_preferences" (
	"user_id" text PRIMARY KEY NOT NULL,
	"native_lang" varchar(8),
	"target_lang" varchar(8),
	"daily_goal" integer DEFAULT 10,
	"tts_voice" varchar(32) DEFAULT 'nova',
	"email_notifications" boolean DEFAULT true,
	"current_streak" integer DEFAULT 0,
	"last_activity_date" date,
	"longest_streak" integer DEFAULT 0,
	"chinese_script" varchar(16) DEFAULT 'simplified',
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "malan-chatbot_user-sessions-table" (
	"chatId" varchar(256) PRIMARY KEY NOT NULL,
	"slug" varchar(256) NOT NULL,
	"settings" jsonb NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"userId" varchar(256),
	"isPinned" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp,
	"updated_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "wordlist" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"word_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "words" (
	"id" serial PRIMARY KEY NOT NULL,
	"word" text NOT NULL,
	"lang" varchar(8) NOT NULL,
	"frequency_rank" integer,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "definitions" ADD CONSTRAINT "definitions_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "malan-chatbot_messagesTable" ADD CONSTRAINT "messages_chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."malan-chatbot_user-sessions-table"("chatId") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "translations" ADD CONSTRAINT "translations_definition_id_definitions_id_fk" FOREIGN KEY ("definition_id") REFERENCES "public"."definitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_preferences" ADD CONSTRAINT "user_preferences_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wordlist" ADD CONSTRAINT "wordlist_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wordlist" ADD CONSTRAINT "wordlist_word_id_words_id_fk" FOREIGN KEY ("word_id") REFERENCES "public"."words"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "definitions_word_id_idx" ON "definitions" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "messages_chat_id_created_at_idx" ON "malan-chatbot_messagesTable" USING btree ("chatId","createdAt");--> statement-breakpoint
CREATE INDEX "translations_definition_id_idx" ON "translations" USING btree ("definition_id");--> statement-breakpoint
CREATE INDEX "translations_target_lang_idx" ON "translations" USING btree ("target_lang");--> statement-breakpoint
CREATE INDEX "wordlist_user_id_idx" ON "wordlist" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "wordlist_word_id_idx" ON "wordlist" USING btree ("word_id");--> statement-breakpoint
CREATE INDEX "wordlist_created_at_idx" ON "wordlist" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "words_lang_idx" ON "words" USING btree ("lang");--> statement-breakpoint
CREATE INDEX "words_word_idx" ON "words" USING btree ("word");