import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  foreignKey,
  pgTableCreator,
  varchar,
  index,
  serial,
  primaryKey,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { Message } from "ai";

export const createTable = pgTableCreator((name) => `malan-chatbot_${name}`);

export const messagesTable = createTable(
  "messagesTable",
  {
    messageId: varchar("messageId", { length: 256 }).primaryKey(),
    chatId: varchar("chatId", { length: 256 }).notNull(),
    role: varchar("role", { length: 256 }),
    createdAt: timestamp("createdAt", { withTimezone: true }),
    parts: jsonb("parts").notNull(),
    content: text("content").notNull(),
  },
  (t) => ({
    chatIdIndex: index("messages_chat_id_created_at_idx").on(
      t.chatId,
      t.createdAt
    ),
    roleIndex: index("messages_role_idx").on(t.role),
    foreignKey: foreignKey({
      columns: [t.chatId],
      foreignColumns: [userSession.chatId],
      name: "messages_chat_id_fk",
    }).onDelete("cascade"),
  })
);

export const userSession = createTable(
  "user-sessions-table",
  {
    chatId: varchar("chatId", { length: 256 }).primaryKey(),
    slug: varchar("slug", { length: 256 }).notNull(),
    settings: jsonb("settings").notNull(),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    userId: varchar("userId", { length: 256 }),
    isPinned: boolean("isPinned").default(false).notNull(),
  },
  (t) => ({
    userIdIndex: index("user_sessions_user_id_idx").on(t.userId),
    pinnedCreatedIndex: index("user_sessions_pinned_created_idx").on(
      t.isPinned,
      t.createdAt
    ),
  })
);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified")
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: timestamp("created_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp("updated_at")
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => ({
    tokenIndex: index("session_token_idx").on(t.token),
    userIdIndex: index("session_user_id_idx").on(t.userId),
  })
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
  },
  (t) => ({
    userIdIndex: index("account_user_id_idx").on(t.userId),
    providerIndex: index("account_provider_idx").on(t.providerId),
  })
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").$defaultFn(
      () => /* @__PURE__ */ new Date()
    ),
    updatedAt: timestamp("updated_at").$defaultFn(
      () => /* @__PURE__ */ new Date()
    ),
  },
  (t) => ({
    identifierIndex: index("verification_identifier_idx").on(t.identifier),
    expiresIndex: index("verification_expires_idx").on(t.expiresAt),
  })
);

export const words = pgTable(
  "words",
  {
    id: serial("id").primaryKey(),
    word: text("word").notNull(),
    lang: varchar("lang", { length: 8 }).notNull(),
    frequencyRank: integer("frequency_rank"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    wordLangIdx: { columns: [t.word, t.lang], unique: true },
    langIndex: index("words_lang_idx").on(t.lang),
    frequencyIndex: index("words_frequency_idx").on(t.frequencyRank),
  })
);

export const definitions = pgTable(
  "definitions",
  {
    id: serial("id").primaryKey(),
    wordId: integer("word_id")
      .references(() => words.id, { onDelete: "cascade" })
      .notNull(),
    pos: varchar("pos", { length: 128 }).notNull(),
    sense: text("sense").notNull(),
    examples: jsonb("examples")
      .notNull()
      .$type<string[]>()
      .default([] as any),
    source: varchar("source", { length: 16 }).default("wiki").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    wordPosSenseUnique: { columns: [t.wordId, t.pos, t.sense], unique: true },
    wordIdIndex: index("definitions_word_id_idx").on(t.wordId),
    sourceIndex: index("definitions_source_idx").on(t.source),
  })
);

export const translations = pgTable(
  "translations",
  {
    definitionId: integer("definition_id")
      .references(() => definitions.id, { onDelete: "cascade" })
      .notNull(),
    targetLang: varchar("target_lang", { length: 8 }).notNull(),
    translatedSense: text("translated_sense").notNull(),
    source: varchar("source", { length: 16 }).default("ai").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    pk: primaryKey(t.definitionId, t.targetLang),
    targetLangIndex: index("translations_target_lang_idx").on(t.targetLang),

  })
);

export const wordlist = pgTable(
  "wordlist",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id")
      .references(() => user.id, { onDelete: "cascade" })
      .notNull(),
    wordId: integer("word_id")
      .references(() => words.id, { onDelete: "cascade" })
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    uniqueUserWord: { columns: [t.userId, t.wordId], unique: true },
    userIdIdx: index("wordlist_user_id_idx").on(t.userId),
    wordIdIdx: index("wordlist_word_id_idx").on(t.wordId),
    createdAtIdx: index("wordlist_created_at_idx").on(t.createdAt),
  })
);

export const userPreferences = pgTable("user_preferences", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  nativeLanguage: varchar("native_lang", { length: 8 }),
  targetLanguage: varchar("target_lang", { length: 8 }),
  dailyGoal: integer("daily_goal").default(10), // words per day
  ttsVoice: varchar("tts_voice", { length: 32 }).default("nova"),
  emailNotifications: boolean("email_notifications").default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const schema = {
  user,
  session,
  account,
  verification,
  messagesTable,
  userSession,
  words,
  definitions,
  translations,
  wordlist,
  userPreferences,
};
