---
phase: quick-260423
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - packages/backend/package.json
  - packages/backend/src/utils/logger.ts
  - packages/backend/src/middleware/request-logger.ts
  - packages/backend/src/index.ts
autonomous: true
requirements: []
must_haves:
  truths:
    - "All backend logs use pino logger (no console.log)"
    - "HTTP requests are logged via middleware"
    - "Logger respects environment (pretty dev, JSON prod)"
  artifacts:
    - path: "packages/backend/src/utils/logger.ts"
      provides: "Pino logger instance with env-based config"
      exports: ["logger"]
    - path: "packages/backend/src/middleware/request-logger.ts"
      provides: "Request logging middleware"
      exports: ["requestLogger"]
    - path: "packages/backend/src/index.ts"
      provides: "App entry with logger + middleware"
      contains: "logger.info", "app.use(requestLogger)"
  key_links:
    - from: "src/utils/logger.ts"
      to: "src/middleware/request-logger.ts"
      via: "import logger"
      pattern: "import.*logger.*from.*utils/logger"
    - from: "src/middleware/request-logger.ts"
      to: "src/index.ts"
      via: "app.use()"
      pattern: "app.use.*requestLogger"
---

<objective>
Add structured logging infrastructure to GESP backend: pino logger instance and request logging middleware.

Purpose: Replace console.log with production-ready structured logging per AGENTS.md spec.
Output: Logger module, request middleware, integrated into Hono app.
</objective>

<execution_context>
@/Users/sam/coding/wopal/wopal-workspace/.agents/wsf/workflows/execute-plan.md
@/Users/sam/coding/wopal/wopal-workspace/.agents/wsf/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/STATE.md
@packages/backend/AGENTS.md

<interfaces>
From AGENTS.md section 6 — Logging spec:
```typescript
// Logger config pattern
const logger = pino({
  level: process.env.LOG_LEVEL ?? "info",
  transport: process.env.NODE_ENV !== "production"
    ? { target: "pino-pretty", options: { colorize: true } }
    : undefined,
});

// Request middleware pattern
export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  const status = c.res.status;
  // Log based on status (error >= 500, warn >= 400, info otherwise)
};
```

Log level semantic rules:
- info: key business events (user registered, login success)
- warn: recoverable anomalies (rate limit near threshold)
- error: operation failures (login failed, DB write failed)
- Field naming: snake_case, include units (duration_ms, user_id)
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Install pino and create logger instance</name>
  <files>packages/backend/package.json, packages/backend/src/utils/logger.ts</files>
  <action>
1. Add dependencies to package.json:
   - `pino` (latest)
   - `pino-pretty` (latest, dev dependency)

2. Create `src/utils/logger.ts`:
   - Configure pino with LOG_LEVEL env var (default "info")
   - Development: use pino-pretty transport with colorize
   - Production: raw JSON output (no transport)
   - Export singleton logger instance

Per AGENTS.md: level semantic rules, snake_case field naming, no console.log.
  </action>
  <verify>
    <automated>bun run typecheck</automated>
  </verify>
  <done>
    - package.json has pino + pino-pretty
    - logger.ts exports configured pino instance
    - Typecheck passes
  </done>
</task>

<task type="auto">
  <name>Task 2: Create request logging middleware</name>
  <files>packages/backend/src/middleware/request-logger.ts</files>
  <action>
Create request-logger middleware per AGENTS.md spec:

1. Import logger from utils/logger
2. Record start timestamp before next()
3. After response: calculate duration_ms
4. Log based on status:
   - status >= 500 → logger.error
   - status >= 400 → logger.warn
   - otherwise → logger.info
5. Fields: method, path, status, duration_ms (snake_case)
6. Export as MiddlewareHandler

Message format: "Request failed" (500+), "Client error" (400+), "Request completed" (otherwise)
  </action>
  <verify>
    <automated>bun run typecheck</automated>
  </verify>
  <done>
    - Middleware file exists
    - Exports requestLogger handler
    - Typecheck passes
  </done>
</task>

<task type="auto">
  <name>Task 3: Integrate logger into index.ts</name>
  <files>packages/backend/src/index.ts</files>
  <action>
Replace all console.log/console.error with logger:

1. Import logger from utils/logger
2. Import requestLogger middleware
3. Replace console.log → logger.info with context:
   - "Pushing database schema..." → { action: "schema_push" }, "Schema push started"
   - "Schema push completed" → { action: "schema_push" }, "Schema push completed"
   - "Seeds completed" → { action: "seed_run" }, "Seeds completed"
   - Server start → { port }, "Server started"

4. Add app.use(requestLogger) BEFORE route mounting (after bootstrap setup)

5. Remove all console.log/error calls

Per AGENTS.md: message is human-readable past tense, context via structured fields.
  </action>
  <verify>
    <automated>bun run typecheck && bun run dev (verify server starts with logs)</automated>
  </verify>
  <done>
    - No console.log/error in index.ts
    - requestLogger middleware mounted
    - Server logs via pino on startup
    - Typecheck passes
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Request → App | Untrusted HTTP input logged via middleware |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-quick-01 | I (Information Disclosure) | request-logger | mitigate | Strip sensitive headers (cookie, authorization) from logged fields |
| T-quick-02 | I (Information Disclosure) | request-logger | mitigate | Do not log request body (may contain passwords) |

Mitigation: request-logger only logs method, path, status, duration — no headers, no body.
</threat_model>

<verification>
- All console.log replaced with logger calls
- Request middleware logs every HTTP request
- Dev environment shows pretty-printed logs
- Production environment outputs JSON
</verification>

<success_criteria>
- `bun run typecheck` passes
- `bun run dev` starts with structured logs (not console)
- Request to any endpoint produces log entry
- No console.log/error in codebase
</success_criteria>

<output>
After completion, create `.planning/quick/260423-qpk-add-pino-logger-and-request-logging-midd/260423-qpk-SUMMARY.md`
</output>