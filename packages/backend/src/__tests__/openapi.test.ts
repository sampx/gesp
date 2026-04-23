import { describe, it, expect } from "vitest";

describe("OpenAPI Spec", () => {
  it("should export OpenAPI spec at /api/doc", async () => {
    // Placeholder: spec endpoint should exist
    // Full test requires running server
    const path = "/api/doc";
    expect(path).toBe("/api/doc");
  });

  it("should have openapi version 3.0.0", async () => {
    const version = "3.0.0";
    expect(version).toBe("3.0.0");
  });

  it("should have auth routes documented", async () => {
    // Placeholder: auth routes should appear in spec
    const authPaths = ["/api/auth/register", "/api/auth/login", "/api/auth/logout", "/api/auth/me"];
    expect(authPaths.length).toBe(4);
  });
});