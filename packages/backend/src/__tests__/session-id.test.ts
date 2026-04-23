import { describe, it, expect } from "vitest";
import { generateSessionId } from "../middleware/session";

describe("Session ID Generation (D-R4)", () => {
  it("should return 43-character base64url string (32 bytes encoded)", () => {
    const sessionId = generateSessionId();
    expect(sessionId.length).toBe(43);
  });

  it("should only contain base64url characters [A-Za-z0-9_-]", () => {
    const sessionId = generateSessionId();
    expect(sessionId).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("should return different values on consecutive calls (randomness)", () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).not.toBe(id2);
  });

  it("should generate 256-bit entropy (32 random bytes)", () => {
    // Verify the decoded bytes are 32 long
    const sessionId = generateSessionId();
    const decoded = Buffer.from(sessionId, "base64url");
    expect(decoded.length).toBe(32);
  });
});