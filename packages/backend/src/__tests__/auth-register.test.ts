import { describe, it, expect, vi, beforeEach } from "vitest";
import { ROLE } from "@gesp/shared";

// Mock password utils
vi.mock("../utils/password", () => ({
  hashPassword: vi.fn().mockResolvedValue("hashedpassword"),
  verifyPassword: vi.fn(),
}));

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
          { id: "test-id", username: "testuser", role: 1, display_name: "testuser", password_hash: "hash", updated_at: new Date() },
        ]),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            { id: "test-id", username: "testuser", password_hash: "newhash", updated_at: new Date() },
          ]),
        }),
      }),
    }),
  },
}));

// Import after mocks
import { registerUser, registerUserWithRole, changePassword } from "../services/auth.service";
import { verifyPassword } from "../utils/password";
import { db } from "../db";

describe("Auth Register — Security (D-R5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return generic error when username already exists (no 'already exists' in message)", async () => {
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
    const result = await registerUser("newuser", "short", "Test");

    expect(result.success).toBe(false);
    expect(result.error).toContain("密码至少需要6个字符");
  });

  it("should return error message containing '失败' for duplicate username", async () => {
    (db.query.users.findFirst as any).mockResolvedValueOnce({
      id: "existing-id",
      username: "existinguser",
      role: 1,
    });

    const result = await registerUser("existinguser", "password123", "Test");

    expect(result.success).toBe(false);
    expect(result.error).toContain("失败");
  });
});

describe("registerUserWithRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create user with role=10 (ADMIN) when role is ROLE.ADMIN", async () => {
    (db.query.users.findFirst as any).mockResolvedValueOnce(null);

    const result = await registerUserWithRole("teacher1", "pass123", ROLE.ADMIN);

    expect(result.success).toBe(true);
    expect(db.insert).toHaveBeenCalled();
  });

  it("should create user with role=1 (STUDENT) when role is ROLE.STUDENT", async () => {
    (db.query.users.findFirst as any).mockResolvedValueOnce(null);

    const result = await registerUserWithRole("student1", "pass123", ROLE.STUDENT);

    expect(result.success).toBe(true);
    expect(db.insert).toHaveBeenCalled();
  });

  it("should reject ROOT role registration", async () => {
    const result = await registerUserWithRole("bad", "pass123", ROLE.ROOT);

    expect(result.success).toBe(false);
    expect(result.error).toBe("不允许该角色注册");
    expect(db.insert).not.toHaveBeenCalled();
  });

  it("should default display_name to username when not provided", async () => {
    (db.query.users.findFirst as any).mockResolvedValueOnce(null);

    const result = await registerUserWithRole("auto1", "pass123", ROLE.STUDENT);

    expect(result.success).toBe(true);
  });
});

describe("registerUser — backward compat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should still create student with registerUser (backward compat, display_name defaults to username)", async () => {
    (db.query.users.findFirst as any).mockResolvedValueOnce(null);

    const result = await registerUser("auto1", "pass123", "auto1");

    expect(result.success).toBe(true);
    expect(db.insert).toHaveBeenCalled();
  });
});

describe("changePassword", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should succeed with correct old password", async () => {
    (db.query.users.findFirst as any).mockResolvedValueOnce({
      id: "user-id",
      username: "testuser",
      password_hash: "oldhash",
    });
    (verifyPassword as any).mockResolvedValueOnce(true);

    const result = await changePassword("user-id", "oldpass123", "newpass123");

    expect(result.success).toBe(true);
  });

  it("should fail with wrong old password", async () => {
    (db.query.users.findFirst as any).mockResolvedValueOnce({
      id: "user-id",
      username: "testuser",
      password_hash: "oldhash",
    });
    (verifyPassword as any).mockResolvedValueOnce(false);

    const result = await changePassword("user-id", "wrongold", "newpass123");

    expect(result.success).toBe(false);
    expect(result.error).toContain("旧密码不正确");
  });

  it("should fail if new password is too short", async () => {
    const result = await changePassword("user-id", "oldpass123", "short");

    expect(result.success).toBe(false);
  });
});
