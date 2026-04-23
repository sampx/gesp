import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text().primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text().notNull().unique(),
  password_hash: text().notNull(),
  display_name: text().notNull(),
  role: integer().notNull().default(1), // 1=student, 10=admin, 100=root
  status: integer().notNull().default(1), // 1=enabled, 2=disabled
  email: text().unique(),
  github_id: text().unique(),
  oidc_id: text().unique(),
  wechat_id: text().unique(),
  telegram_id: text().unique(),
  created_at: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  updated_at: integer({ mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
});

export const usersIndexes = {
  usernameIdx: index("users_username_idx").on(users.username),
  roleIdx: index("users_role_idx").on(users.role),
  emailIdx: index("users_email_idx").on(users.email),
};