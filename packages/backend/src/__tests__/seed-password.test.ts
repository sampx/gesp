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

  it("should throw Error when NODE_ENV=production and ROOT_PASSWORD not set", async () => {
    // Mock: no existing root admin
    (db.query.users.findFirst as any).mockResolvedValueOnce(undefined);

    // Set production env without ROOT_PASSWORD
    process.env.NODE_ENV = "production";
    delete process.env.ROOT_PASSWORD;

    await expect(seedAdmin()).rejects.toThrow("ROOT_PASSWORD must be set");
  });

  it("should seed successfully when NODE_ENV=production and ROOT_PASSWORD is set", async () => {
    // Mock: no existing root admin
    (db.query.users.findFirst as any).mockResolvedValueOnce(undefined);

    // Set production env with ROOT_PASSWORD
    process.env.NODE_ENV = "production";
    process.env.ROOT_PASSWORD = "secure-root-password";

    await expect(seedAdmin()).resolves.toBeUndefined();
    expect(db.insert).toHaveBeenCalled();
  });

  it("should seed successfully when NODE_ENV=development (no ROOT_PASSWORD)", async () => {
    // Mock: no existing root admin
    (db.query.users.findFirst as any).mockResolvedValueOnce(undefined);

    // Set development env without ROOT_PASSWORD
    process.env.NODE_ENV = "development";
    delete process.env.ROOT_PASSWORD;

    await expect(seedAdmin()).resolves.toBeUndefined();
    expect(db.insert).toHaveBeenCalled();
  });

  it("should skip seed when root user already exists (regardless of environment)", async () => {
    // Mock: existing root admin
    (db.query.users.findFirst as any).mockResolvedValueOnce({
      id: "existing-root",
      username: "root",
      role: ROLE.ROOT,
    });

    // Set production env without ROOT_PASSWORD
    process.env.NODE_ENV = "production";
    delete process.env.ROOT_PASSWORD;

    // Should NOT throw - skips before checking password
    await expect(seedAdmin()).resolves.toBeUndefined();
    expect(db.insert).not.toHaveBeenCalled();
  });
});