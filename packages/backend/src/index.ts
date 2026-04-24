import { Hono } from "hono";
import { openAPISpecs } from "hono-openapi";
import type { Context } from "hono";
import { spawnSync } from "bun";
import authRoutes from "./routes/auth";
import debugRoutes from "./routes/debug";
import { adminKnowledgeRouter, studentKnowledgeRouter } from "./routes/knowledge";
import { runSeeds } from "./db/seed/admin.seed";
import { logger } from "./utils/logger";
import { requestLogger } from "./middleware/request-logger";
import { createEmbeddingProvider } from "./services/embedding";
import { LanceDBFileStore } from "./services/vector-store";
import { KnowledgeBaseService } from "./services/knowledge-base";

// Services — embedding provider for knowledge base
export { createEmbeddingProvider, type EmbeddingProvider } from './services/embedding';

const app = new Hono();

async function findAvailablePort(startPort: number, maxAttempts = 10): Promise<number> {
  for (let port = startPort; port < startPort + maxAttempts; port++) {
    try {
      const probe = Bun.serve({
        fetch: () => new Response("probe"),
        port,
      });
      probe.stop();
      return port;
    } catch {
      continue;
    }
  }
  throw new Error(`No available port found between ${startPort} and ${startPort + maxAttempts - 1}`);
}

async function pushSchema(): Promise<void> {
  const result = spawnSync({
    cmd: ["bun", "run", "db:push"],
    cwd: import.meta.dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (result.exitCode !== 0) {
    const stderr = result.stderr.toString();
    logger.error({ action: "schema_push", exit_code: result.exitCode }, "Schema push failed");
    throw new Error(stderr || `Schema push failed with exit code ${result.exitCode}`);
  }
}

async function bootstrap() {
  if (process.env.NODE_ENV !== "production") {
    logger.info({ action: "schema_push" }, "Schema push started");
    await pushSchema();
    logger.info({ action: "schema_push" }, "Schema push completed");
  }
  await runSeeds();
  logger.info({ action: "seed_run" }, "Seeds completed");

  app.get("/", (c: Context) => c.json({ success: true, message: "GESP Backend API", data: { version: "0.0.1" } }));

  // Request logging middleware - mount before routes
  app.use(requestLogger);

  // Initialize KnowledgeBaseService
  const embeddingProvider = createEmbeddingProvider();
  const vectorStore = new LanceDBFileStore({
    dbPath: process.env.LANCEDB_PATH || './data/gesp.lance',
    embeddingProvider,
  });
  const knowledgeBaseService = new KnowledgeBaseService(vectorStore, embeddingProvider);

  // Inject KnowledgeBaseService into request context
  app.use('/api/admin/knowledge/*', async (c, next) => {
    c.set('knowledgeBaseService', knowledgeBaseService);
    await next();
  });
  app.use('/api/student/knowledge/*', async (c, next) => {
    c.set('knowledgeBaseService', knowledgeBaseService);
    await next();
  });

  app.route("/api/auth", authRoutes);
  app.route("/api/admin/knowledge", adminKnowledgeRouter);
  app.route("/api/student/knowledge", studentKnowledgeRouter);

  // Debug route - production disabled unless ENABLE_DEBUG=true
  if (process.env.NODE_ENV !== "production" || process.env.ENABLE_DEBUG === "true") {
    app.route("/debug", debugRoutes);
  }

  // OpenAPI spec export
  app.use("/api/doc", openAPISpecs(app, {
    documentation: {
      info: {
        title: "GESP Learning Platform API",
        version: "1.0.0",
      },
    },
  }));

  const basePort = parseInt(process.env.PORT || "3000", 10);
  const port = await findAvailablePort(basePort);
  logger.info({ port }, "Server started");

  Bun.serve({
    fetch: app.fetch,
    port,
  });
}

bootstrap();