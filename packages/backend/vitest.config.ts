import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      DATABASE_URL: "./data/test.db", // Use separate test database
      NODE_ENV: "test",
    },
    setupFiles: ["./src/__tests__/setup.ts"],
  },
});