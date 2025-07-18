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
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const createTable = pgTableCreator((name) => `malan-chatbot_${name}`);

export const messagesTable = createTable(
  "messagesTable",
  {
    messageId: varchar("messageId", { length: 256 }).primaryKey(),
    chatId: varchar("chatId", { length: 256 }).notNull(),
    role: varchar("role", { length: 256 }),
    createdAt: timestamp("createdAt", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    parts: jsonb("parts").notNull(),
    content: text("content").notNull(),
  },
  (t) => ({
    chatIdIndex: index("messages_chat_id_created_at_idx").on(
      t.chatId,
      t.createdAt
    ),
    // Performance optimization indexes for chat sessions
    chatCreatedAscIdx: index("idx_messages_chat_created_asc").on(
      t.chatId,
      t.createdAt
    ),
    chatCreatedDescIdx: index("idx_messages_chat_created_desc").on(
      t.chatId,
      t.createdAt
    ),
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
    lastMessageAt: timestamp("lastMessageAt", { withTimezone: true }),
  },
  (t) => ({
    // Performance optimization indexes for chat sessions
    userPinnedCreatedIdx: index("idx_user_session_user_pinned_created").on(
      t.userId,
      t.isPinned,
      t.createdAt
    ),
    userIdIdx: index("idx_user_session_user_id").on(t.userId),
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

export const session = pgTable("session", {
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
});

export const account = pgTable("account", {
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
});

export const verification = pgTable("verification", {
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
});

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
    langIdx: index("words_lang_idx").on(t.lang),
    wordIdx: index("words_word_idx").on(t.word),
    // Performance optimization indexes
    langWordIdx: index("idx_words_lang_word").on(t.lang, t.word),
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
      .default([] as string[]),
    source: varchar("source", { length: 16 }).default("wiki").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (t) => ({
    wordPosSenseUnique: { columns: [t.wordId, t.pos, t.sense], unique: true },
    wordIdIdx: index("definitions_word_id_idx").on(t.wordId),
    // Performance optimization indexes
    wordPosIdx: index("idx_definitions_word_pos").on(t.wordId, t.pos),
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
    definitionIdIdx: index("translations_definition_id_idx").on(t.definitionId),
    targetLangIdx: index("translations_target_lang_idx").on(t.targetLang),
    // Performance optimization indexes
    defLangIdx: index("idx_translations_def_lang").on(
      t.definitionId,
      t.targetLang
    ),
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
    // Performance optimization indexes
    userLangCreatedIdx: index("idx_wordlist_user_lang_created").on(
      t.userId,
      t.createdAt
    ),
    userWordIdx: index("idx_wordlist_user_word").on(t.userId, t.wordId),
    joinOptimizationIdx: index("idx_wordlist_join_optimization").on(
      t.userId,
      t.wordId
    ),
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
  currentStreak: integer("current_streak").default(0), // consecutive days of activity
  lastActivityDate: date("last_activity_date"), // last day user was active
  longestStreak: integer("longest_streak").default(0), // best streak achieved
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const japaneseTokens = pgTable(
  "japanese_tokens",
  {
    id: serial("id").primaryKey(),
    kanji: text("kanji"), // The kanji form (can be null for kana-only words)
    reading: text("reading").notNull(), // The reading (hiragana/katakana)
    frequency: integer("frequency").notNull(), // Frequency rank (negative = more frequent)
    partOfSpeech: text("part_of_speech").notNull(), // noun, verb, adjective, etc.
    isPriority: boolean("is_priority").default(false), // Priority words (marked with ★)
    entryId: integer("entry_id"), // Original JMdict entry ID for reference
    fileCount: integer("file_count").default(1), // How many files this token appeared in
  },
  (t) => ({
    // Indexes for efficient tokenization queries
    readingIdx: index("reading_idx").on(t.reading),
    kanjiIdx: index("kanji_idx").on(t.kanji),
    frequencyIdx: index("frequency_idx").on(t.frequency),
    posIdx: index("pos_idx").on(t.partOfSpeech),
    // Composite index for common queries
    readingKanjiIdx: index("reading_kanji_idx").on(t.reading, t.kanji),
  })
);

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
  japaneseTokens,
};
