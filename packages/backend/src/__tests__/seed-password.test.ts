import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { seedAdmin } from "../db/seed/admin.seed";
import { db } from "../db";
import { ROLE } from "@gesp/shared";

// Mock database
vi.mock("../db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

// Mock password utils
vi.mock("../../utils/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashed-password"),
}));

describe("Admin Seed Password (D-R7)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("should throw Error when NODE_ENV=production and ADMIN_PASSWORD not set", async () => {
    // Mock: no existing root admin
    (db.query.users.findFirst as any).mockResolvedValueOnce(undefined);

    // Set production env without ADMIN_PASSWORD
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_PASSWORD;

    await expect(seedAdmin()).rejects.toThrow("ADMIN_PASSWORD must be set");
  });

  it("should seed successfully when NODE_ENV=production and ADMIN_PASSWORD is set", async () => {
    // Mock: no existing root admin
    (db.query.users.findFirst as any).mockResolvedValueOnce(undefined);

    // Set production env with ADMIN_PASSWORD
    process.env.NODE_ENV = "production";
    process.env.ADMIN_PASSWORD = "secure-admin-password";

    await expect(seedAdmin()).resolves.toBeUndefined();
    expect(db.insert).toHaveBeenCalled();
  });

  it("should seed successfully when NODE_ENV=development (no ADMIN_PASSWORD)", async () => {
    // Mock: no existing root admin
    (db.query.users.findFirst as any).mockResolvedValueOnce(undefined);

    // Set development env without ADMIN_PASSWORD
    process.env.NODE_ENV = "development";
    delete process.env.ADMIN_PASSWORD;

    await expect(seedAdmin()).resolves.toBeUndefined();
    expect(db.insert).toHaveBeenCalled();
  });

  it("should skip seed when admin already exists (regardless of environment)", async () => {
    // Mock: existing root admin
    (db.query.users.findFirst as any).mockResolvedValueOnce({
      id: "existing-root",
      username: "admin",
      role: ROLE.ROOT,
    });

    // Set production env without ADMIN_PASSWORD
    process.env.NODE_ENV = "production";
    delete process.env.ADMIN_PASSWORD;

    // Should NOT throw - skips before checking password
    await expect(seedAdmin()).resolves.toBeUndefined();
    expect(db.insert).not.toHaveBeenCalled();
  });
});