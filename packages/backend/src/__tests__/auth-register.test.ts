import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerUser } from "../services/auth.service";
import { db } from "../db";

// Mock database
vi.mock("../db", () => ({
  db: {
    query: {
      users: {
        findFirst: vi.fn(),
      },
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: "test-id", username: "testuser", role: 1 },
        ]),
      }),
    }),
  },
}));

describe("Auth Register (D-R5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return generic error when username already exists (no 'already exists' in message)", async () => {
    // Mock: user already exists
    (db.query.users.findFirst as any).mockResolvedValueOnce({
      id: "existing-id",
      username: "existinguser",
      role: 1,
    });

    const result = await registerUser("existinguser", "password123", "Test");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).not.toContain("already exists");
  });

  it("should return generic error when username already exists (no 'Username' in message)", async () => {
    (db.query.users.findFirst as any).mockResolvedValueOnce({
      id: "existing-id",
      username: "existinguser",
      role: 1,
    });

    const result = await registerUser("existinguser", "password123", "Test");

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).not.toContain("Username");
  });

  it("should preserve password validation error message (not security-sensitive)", async () => {
    // Mock: no existing user
    (db.query.users.findFirst as any).mockResolvedValueOnce(undefined);

    const result = await registerUser("newuser", "short", "Test");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Password must be at least 6 characters");
  });

  it("should return error message containing 'failed' for duplicate username", async () => {
    (db.query.users.findFirst as any).mockResolvedValueOnce({
      id: "existing-id",
      username: "existinguser",
      role: 1,
    });

    const result = await registerUser("existinguser", "password123", "Test");

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/failed/i);
  });
});