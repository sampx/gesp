import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../utils/password";

describe("Password Utilities", () => {
  it("should hash a password", async () => {
    const password = "test123";
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(20);
  });

  it("should verify correct password", async () => {
    const password = "test123";
    const hash = await hashPassword(password);
    const result = await verifyPassword(password, hash);
    expect(result).toBe(true);
  });

  it("should reject incorrect password", async () => {
    const password = "test123";
    const hash = await hashPassword(password);
    const result = await verifyPassword("wrong", hash);
    expect(result).toBe(false);
  });

  it("should produce different hashes for same password", async () => {
    const password = "test123";
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});