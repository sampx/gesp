import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/password";
import { ROLE, USER_STATUS } from "@gesp/shared";

export async function registerUser(
  username: string,
  password: string,
  displayName: string
): Promise<{ success: boolean; user?: typeof users.$inferSelect; error?: string }> {
  // Check username uniqueness
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    return { success: false, error: "Registration failed. Please try different credentials." };
  }

  // Validate password length
  if (password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const [user] = await db.insert(users).values({
    username,
    password_hash: passwordHash,
    display_name: displayName,
    role: ROLE.STUDENT,
    status: USER_STATUS.ENABLED,
  }).returning();

  return { success: true, user };
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: typeof users.$inferSelect; error?: string }> {
  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (!user) {
    return { success: false, error: "Invalid username or password" };
  }

  if (user.status !== USER_STATUS.ENABLED) {
    return { success: false, error: "Account is disabled" };
  }

  const validPassword = await verifyPassword(password, user.password_hash);
  if (!validPassword) {
    return { success: false, error: "Invalid username or password" };
  }

  return { success: true, user };
}

export async function getUserById(userId: string): Promise<typeof users.$inferSelect | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  return user ?? null;
}