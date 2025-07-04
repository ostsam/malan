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
    foreignKey: foreignKey({
      columns: [t.chatId],
      foreignColumns: [userSession.chatId],
      name: "messages_chat_id_fk",
    }).onDelete("cascade"),
  })
);

export const userSession = createTable("user-sessions-table", {
  chatId: varchar("chatId", { length: 256 }).primaryKey(),
  slug: varchar("slug", { length: 256 }).notNull(),
  settings: jsonb("settings").notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  userId: varchar("userId", { length: 256 }),
  isPinned: boolean("isPinned").default(false).notNull(),
});

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
  })
);

export const definitions = pgTable(
  "definitions",
  {
    id: serial("id").primaryKey(),
    wordId: integer("word_id")
      .references(() => words.id, { onDelete: "cascade" })
      .notNull(),
    pos: varchar("pos", { length: 32 }).notNull(),
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
};
