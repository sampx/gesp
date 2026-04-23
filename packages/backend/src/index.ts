import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import type { Context } from "hono";

const app = new Hono();

app.get("/", (c: Context) => c.json({ success: true, message: "GESP Backend API", data: { version: "0.0.1" } }));

// TODO: Mount auth routes
// app.route("/api/auth", authRoutes);
// app.route("/api/admin", adminRoutes);
// app.route("/api/student", studentRoutes);

// OpenAPI spec export
app.use("/api/doc", openAPISpecs(app, {
  documentation: {
    info: {
      title: "GESP Learning Platform API",
      version: "1.0.0",
    },
  },
}));

const port = process.env.PORT || 3000;
console.log(`GESP Backend running on http://localhost:${port}`);

export default app;