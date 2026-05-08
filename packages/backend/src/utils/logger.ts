import pino from "pino";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "../..");

const logDir = resolve(pkgDir, process.env.LOG_DIR ?? "./logs");
const logFile = resolve(logDir, process.env.LOG_FILE ?? "gesp.log");
const logLevel = process.env.LOG_LEVEL ?? "info";

mkdirSync(logDir, { recursive: true });

const logger = pino(
  { level: logLevel },
  pino.multistream([
    {
      level: logLevel,
      stream: pino.transport({
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:yyyy-mm-dd HH:mm:ss" },
      }),
    },
    {
      level: "debug",
      stream: pino.destination({ dest: logFile, append: true, mkdir: true }),
    },
  ])
);

export { logger };
