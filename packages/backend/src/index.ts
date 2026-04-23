import { OpenAPIHono } from "hono-openapi";

const app = new OpenAPIHono();

app.get("/", (c) => c.json({ success: true, message: "GESP Backend API", data: { version: "0.0.1" } }));

// TODO: Mount auth routes
// app.route("/api/auth", authRoutes);
// app.route("/api/admin", adminRoutes);
// app.route("/api/student", studentRoutes);

// OpenAPI spec export
app.doc("/api/doc", {
  openapi: "3.0.0",
  info: {
    title: "GESP Learning Platform API",
    version: "1.0.0",
  },
});

const port = process.env.PORT || 3000;
console.log(`GESP Backend running on http://localhost:${port}`);

export default app;