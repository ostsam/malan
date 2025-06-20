import { pgTable, text, timestamp, boolean, integer, jsonb, foreignKey, pgTableCreator, varchar, index } from "drizzle-orm/pg-core";
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
    chatIdIndex: index("messages_chat_id_created_at_idx").on(t.chatId, t.createdAt),
    foreignKey: foreignKey({ columns: [t.chatId], foreignColumns: [userSession.chatId] }),
  }),
);

export const userSession = createTable("user-sessions-table", {
  chatId: varchar("chatId", { length: 256 }).primaryKey(),
  settings: jsonb('settings').notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  userId: varchar("userId", { length: 256 }),
});

export const user = pgTable("user", {
					id: text('id').primaryKey(),
					name: text('name').notNull(),
 email: text('email').notNull().unique(),
 emailVerified: boolean('email_verified').$defaultFn(() => false).notNull(),
 image: text('image'),
 createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull(),
 updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date()).notNull()
				});

export const session = pgTable("session", {
					id: text('id').primaryKey(),
					expiresAt: timestamp('expires_at').notNull(),
 token: text('token').notNull().unique(),
 createdAt: timestamp('created_at').notNull(),
 updatedAt: timestamp('updated_at').notNull(),
 ipAddress: text('ip_address'),
 userAgent: text('user_agent'),
 userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' })
				});

export const account = pgTable("account", {
					id: text('id').primaryKey(),
					accountId: text('account_id').notNull(),
 providerId: text('provider_id').notNull(),
 userId: text('user_id').notNull().references(()=> user.id, { onDelete: 'cascade' }),
 accessToken: text('access_token'),
 refreshToken: text('refresh_token'),
 idToken: text('id_token'),
 accessTokenExpiresAt: timestamp('access_token_expires_at'),
 refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
 scope: text('scope'),
 password: text('password'),
 createdAt: timestamp('created_at').notNull(),
 updatedAt: timestamp('updated_at').notNull()
				});

export const verification = pgTable("verification", {
					id: text('id').primaryKey(),
					identifier: text('identifier').notNull(),
 value: text('value').notNull(),
 expiresAt: timestamp('expires_at').notNull(),
 createdAt: timestamp('created_at').$defaultFn(() => /* @__PURE__ */ new Date()),
 updatedAt: timestamp('updated_at').$defaultFn(() => /* @__PURE__ */ new Date())
				});

export const schema = {user, session, account, verification, messagesTable, userSession};