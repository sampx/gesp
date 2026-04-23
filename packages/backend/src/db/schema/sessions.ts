import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const sessions = sqliteTable("sessions", {
  id: text().primaryKey(), // UUID session ID set by application
  user_id: text().notNull().references(() => users.id, { onDelete: "cascade" }),
  created_at: integer({ mode: "timestamp" }).notNull(),
  expires_at: integer({ mode: "timestamp" }).notNull(),
  role: integer().notNull(), // Copy of user role for TTL differentiation
});

export const sessionsIndexes = {
  userIdIdx: index("sessions_user_id_idx").on(sessions.user_id),
  expiresAtIdx: index("sessions_expires_at_idx").on(sessions.expires_at),
};