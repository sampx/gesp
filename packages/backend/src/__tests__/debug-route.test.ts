import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import debugRoutes from "../routes/debug";

describe("Debug Route", () => {
  const app = new Hono();
  app.route("/debug", debugRoutes);

  it("should serve HTML on GET /debug", async () => {
    const res = await app.request("/debug");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("GESP Debug Interface");
  });

  it("should have register button in HTML", async () => {
    const res = await app.request("/debug");
    const html = await res.text();
    expect(html).toContain("onclick=\"register()");
  });

  it("should have login button in HTML", async () => {
    const res = await app.request("/debug");
    const html = await res.text();
    expect(html).toContain("onclick=\"login()");
  });

  it("should have logout button in HTML", async () => {
    const res = await app.request("/debug");
    const html = await res.text();
    expect(html).toContain("onclick=\"logout()");
  });

  it("should have get current user button in HTML", async () => {
    const res = await app.request("/debug");
    const html = await res.text();
    expect(html).toContain("onclick=\"getCurrentUser()");
  });

  it("should return health check JSON on GET /debug/health", async () => {
    const res = await app.request("/debug/health");
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.phase).toBe(1);
  });
});
