/**
 * Test setup — initializes test database schema before all tests
 */

import { spawnSync } from "bun";

// Push schema to test database
const result = spawnSync({
  cmd: ["bun", "run", "db:push"],
  cwd: import.meta.dir.replace("/__tests__", ""),
  stdout: "pipe",
  stderr: "pipe",
  env: {
    ...process.env,
    DATABASE_URL: "./data/test.db",
  },
});

if (result.exitCode !== 0) {
  console.error("Test schema push failed:", result.stderr.toString());
  throw new Error("Test database initialization failed");
}