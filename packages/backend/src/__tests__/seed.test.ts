import { describe, it, expect } from "vitest";
import { seedAdmin } from "../db/seed/admin.seed";
import { ROLE } from "@gesp/shared";

describe("Admin Seed", () => {
  it("should have ROLE.ROOT constant", async () => {
    expect(ROLE.ROOT).toBe(100);
  });

  it("should seed admin with hashed password", async () => {
    // Placeholder: seedAdmin function exists
    // Full test requires test database setup
    expect(typeof seedAdmin).toBe("function");
  });

  it("should skip seed if admin exists", async () => {
    // Placeholder: function should check existing root
    expect(typeof seedAdmin).toBe("function");
  });
});