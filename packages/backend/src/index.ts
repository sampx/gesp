import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import type { Context } from "hono";
import { spawnSync } from "bun";
import authRoutes from "./routes/auth";
import debugRoutes from "./routes/debug";
import { runSeeds } from "./db/seed/admin.seed";
import { logger } from "./utils/logger";
import { requestLogger } from "./middleware/request-logger";

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
  logger.info({ action: "schema_push" }, "Schema push started");
  await pushSchema();
  logger.info({ action: "schema_push" }, "Schema push completed");
  await runSeeds();
  logger.info({ action: "seed_run" }, "Seeds completed");

  app.get("/", (c: Context) => c.json({ success: true, message: "GESP Backend API", data: { version: "0.0.1" } }));

  // Request logging middleware - mount before routes
  app.use(requestLogger);

  app.route("/api/auth", authRoutes);

  // Debug route - production disabled unless ENABLE_DEBUG=true
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_DEBUG === "true") {
    app.route("/debug", debugRoutes);
  }

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
  logger.info({ port }, "Server started");

  Bun.serve({
    fetch: app.fetch,
    port,
  });
}

bootstrap();