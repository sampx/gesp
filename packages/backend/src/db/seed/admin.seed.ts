import { db } from "../index";
import { users } from "../schema/users";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../utils/password";
import { logger } from "../../utils/logger";
import { ROLE, USER_STATUS } from "@gesp/shared";

export async function seedAdmin(): Promise<void> {
  // Check if root admin already exists
  const existingRoot = await db.query.users.findFirst({
    where: eq(users.role, ROLE.ROOT),
  });

  if (existingRoot) {
    logger.info({ action: "seed_skip" }, "Root user already exists, skipping seed");
    return;
  }

  // Production: require ROOT_PASSWORD
  const password = process.env.ROOT_PASSWORD;
  if (process.env.NODE_ENV === "production" && !password) {
    throw new Error("ROOT_PASSWORD must be set in production environment");
  }

  const username = process.env.ROOT_USERNAME || "root";
  const displayName = process.env.ROOT_DISPLAY_NAME || "超级管理员";

  // Development: warn when using default password
  if (!password) {
    logger.warn(
      { action: "seed_default_password", env: "development" },
      "Using default password 'root123'. Set ROOT_PASSWORD environment variable for security"
    );
  }

  // Hash password
  const passwordHash = await hashPassword(password || "root123");

  // Insert root admin
  await db.insert(users).values({
    id: crypto.randomUUID(),
    username,
    password_hash: passwordHash,
    display_name: displayName,
    role: ROLE.ROOT,
    status: USER_STATUS.ENABLED,
  });

  logger.info({ action: "seed_root", username }, "Root user seeded");
}

// Export function to run seed
export async function runSeeds(): Promise<void> {
  await seedAdmin();
}
