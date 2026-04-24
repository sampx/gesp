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
    logger.info({ action: "seed_skip" }, "Admin already exists, skipping seed");
    return;
  }

  // Production: require ADMIN_PASSWORD
  const password = process.env.ADMIN_PASSWORD;
  if (process.env.NODE_ENV === "production" && !password) {
    throw new Error("ADMIN_PASSWORD must be set in production environment");
  }

  const username = process.env.ADMIN_USERNAME || "admin";
  const displayName = process.env.ADMIN_DISPLAY_NAME || "System Admin";

  // Development: warn when using default password
  if (!password) {
    logger.warn(
      { action: "seed_default_password", env: "development" },
      "Using default password 'admin123'. Set ADMIN_PASSWORD environment variable for security"
    );
  }

  // Hash password
  const passwordHash = await hashPassword(password || "admin123");

  // Insert root admin
  await db.insert(users).values({
    id: crypto.randomUUID(),
    username,
    password_hash: passwordHash,
    display_name: displayName,
    role: ROLE.ROOT,
    status: USER_STATUS.ENABLED,
  });

  logger.info({ action: "seed_admin", username }, "Root admin seeded");
}

// Export function to run seed
export async function runSeeds(): Promise<void> {
  await seedAdmin();
}