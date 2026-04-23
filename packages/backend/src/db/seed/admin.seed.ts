import { db } from "../index";
import { users } from "../schema/users";
import { eq } from "drizzle-orm";
import { hashPassword } from "../../utils/password";
import { ROLE, USER_STATUS } from "@gesp/shared";

export async function seedAdmin(): Promise<void> {
  // Check if root admin already exists
  const existingRoot = await db.query.users.findFirst({
    where: eq(users.role, ROLE.ROOT),
  });

  if (existingRoot) {
    console.log("Admin already exists, skipping seed");
    return;
  }

  // Get credentials from env or use defaults
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD || "admin123";
  const displayName = process.env.ADMIN_DISPLAY_NAME || "System Admin";

  // Hash password
  const passwordHash = await hashPassword(password);

  // Insert root admin
  await db.insert(users).values({
    id: crypto.randomUUID(),
    username,
    password_hash: passwordHash,
    display_name: displayName,
    role: ROLE.ROOT,
    status: USER_STATUS.ENABLED,
  });

  console.log(`Root admin seeded: ${username}`);
  console.log("WARNING: Change default password after first login in production!");
}

// Export function to run seed
export async function runSeeds(): Promise<void> {
  await seedAdmin();
}