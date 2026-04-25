import { db } from "../db";
import { users } from "../db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { hashPassword, verifyPassword } from "../utils/password";
import { ROLE, USER_STATUS } from "@gesp/shared";

export async function registerUser(
  username: string,
  password: string,
  displayName: string
): Promise<{ success: boolean; user?: typeof users.$inferSelect; error?: string }> {
  return registerUserWithRole(username, password, ROLE.STUDENT, displayName);
}

export async function registerUserWithRole(
  username: string,
  password: string,
  role: number,
  displayName?: string
): Promise<{ success: boolean; user?: typeof users.$inferSelect; error?: string }> {
  // Validate role — only STUDENT(1) and ADMIN(10) allowed
  if (role !== ROLE.STUDENT && role !== ROLE.ADMIN) {
    return { success: false, error: "不允许该角色注册" };
  }

  // Validate password FIRST (before DB query) - prevents user enumeration
  if (password.length < 6) {
    return { success: false, error: "密码至少需要6个字符" };
  }

  // Check username uniqueness
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    return { success: false, error: "注册失败，请尝试不同的凭据" };
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const resolvedDisplayName = displayName ?? username;
  const [user] = await db.insert(users).values({
    username,
    password_hash: passwordHash,
    display_name: resolvedDisplayName,
    role,
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

export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  // Validate new password length
  if (newPassword.length < 6) {
    return { success: false, error: "新密码至少需要6个字符" };
  }

  // Find user
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return { success: false, error: "用户不存在" };
  }

  // Verify old password
  const validPassword = await verifyPassword(oldPassword, user.password_hash);
  if (!validPassword) {
    return { success: false, error: "旧密码不正确" };
  }

  // Update password
  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({
    password_hash: passwordHash,
    updated_at: new Date(),
  }).where(eq(users.id, userId));

  return { success: true };
}

// --- Admin user management functions ---

export async function listUsers(options?: { page?: number; pageSize?: number }) {
  const page = options?.page ?? 1;
  const pageSize = options?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  // Get total count
  const countResult = await db.select({ count: sql<number>`count(*)` }).from(users);
  const total = countResult[0].count;

  // Get users (exclude password_hash)
  const userList = await db.select({
    id: users.id,
    username: users.username,
    display_name: users.display_name,
    role: users.role,
    status: users.status,
    email: users.email,
    created_at: users.created_at,
    updated_at: users.updated_at,
  }).from(users).orderBy(desc(users.created_at)).limit(pageSize).offset(offset);

  return { users: userList, total, page, pageSize };
}

export async function createUserByAdmin(
  username: string,
  password: string,
  role: number
): Promise<{ success: boolean; user?: Omit<typeof users.$inferSelect, "password_hash">; error?: string }> {
  // Validate role — only STUDENT(1) and ADMIN(10) allowed
  if (role !== ROLE.STUDENT && role !== ROLE.ADMIN) {
    return { success: false, error: "无效角色，仅支持学员和教员" };
  }

  // Validate password
  if (password.length < 6) {
    return { success: false, error: "密码至少需要6个字符" };
  }

  // Check username uniqueness
  const existing = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (existing) {
    return { success: false, error: "该用户名已被使用" };
  }

  // Create user
  const passwordHash = await hashPassword(password);
  const [newUser] = await db.insert(users).values({
    username,
    password_hash: passwordHash,
    display_name: username,
    role,
    status: USER_STATUS.ENABLED,
  }).returning();

  // Return without password_hash
  const { password_hash: _, ...safeUser } = newUser;
  return { success: true, user: safeUser };
}

export async function toggleUserStatus(
  userId: string
): Promise<{ success: boolean; newStatus?: number; error?: string }> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return { success: false, error: "用户不存在" };
  }

  if (user.role === ROLE.ROOT) {
    return { success: false, error: "不能修改超级管理员状态" };
  }

  const newStatus = user.status === USER_STATUS.ENABLED ? USER_STATUS.DISABLED : USER_STATUS.ENABLED;

  await db.update(users).set({
    status: newStatus,
    updated_at: new Date(),
  }).where(eq(users.id, userId));

  return { success: true, newStatus };
}

export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (newPassword.length < 6) {
    return { success: false, error: "密码至少需要6个字符" };
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) {
    return { success: false, error: "用户不存在" };
  }

  if (user.role === ROLE.ROOT) {
    return { success: false, error: "不能重置超级管理员密码" };
  }

  const passwordHash = await hashPassword(newPassword);
  await db.update(users).set({
    password_hash: passwordHash,
    updated_at: new Date(),
  }).where(eq(users.id, userId));

  return { success: true };
}
