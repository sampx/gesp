import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import type { Context } from "hono";
import { spawnSync } from "bun";
import authRoutes from "./routes/auth";
import { runSeeds } from "./db/seed/admin.seed";

const app = new Hono();

async function pushSchema(): Promise<void> {
  const result = spawnSync({
    cmd: ["bun", "run", "db:push"],
    cwd: import.meta.dir,
    stdout: "inherit",
    stderr: "inherit",
  });
  if (result.exitCode !== 0) {
    throw new Error(`Schema push failed with exit code ${result.exitCode}`);
  }
}

async function bootstrap() {
  console.log("Pushing database schema...");
  await pushSchema();
  console.log("Schema push completed");
  await runSeeds();
  console.log("Seeds completed");

  app.get("/", (c: Context) => c.json({ success: true, message: "GESP Backend API", data: { version: "0.0.1" } }));

  app.route("/api/auth", authRoutes);

  // TODO: Mount admin and student routes
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

  Bun.serve({
    fetch: app.fetch,
    port,
  });
}

bootstrap();