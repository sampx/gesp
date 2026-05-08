import { appendFileSync, existsSync, mkdirSync } from "fs";
import { dirname, join } from "path";

export type LogFn = (message: string) => void;

function getLogDir(): string {
  return process.env.LOG_DIR ?? "./logs";
}

function getLogFile(): string {
  const logDir = getLogDir();
  const logFile = process.env.GESP_PLUGIN_LOG_FILE ?? "gesp-plugin.log";
  return join(logDir, logFile);
}

function ensureLogFile(logFile: string): boolean {
  const dir = dirname(logFile);
  if (!existsSync(dir)) {
    try {
      mkdirSync(dir, { recursive: true });
    } catch {
      return false;
    }
  }
  return true;
}

function formatTimestamp(): string {
  const now = new Date();
  const parts = now.toLocaleString("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).split(/[,\/\s:]+/);

  const [month, day, year, hour, minute, second] = parts;
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function isDebugEnabled(): boolean {
  const debug = process.env.GESP_PLUGIN_DEBUG ?? process.env.LOG_LEVEL;
  if (!debug) return false;
  const level = debug.trim().toLowerCase();
  return ["1", "*", "all", "debug", "trace"].includes(level);
}

function writeLog(prefix: string, message: string): void {
  const logFile = getLogFile();
  if (!ensureLogFile(logFile)) return;

  const timestamp = formatTimestamp();
  const header = `${timestamp} ${prefix} `;
  const lines = message.split("\n");
  const logMessage =
    lines
      .map((line, i) => (i === 0 ? `${header}${line}` : `  ${line}`))
      .join("\n") + "\n\n";

  try {
    appendFileSync(logFile, logMessage, "utf-8");
  } catch {
    // silently ignore
  }
}

export function createDebugLog(prefix = "[gesp-plugin]"): LogFn {
  return (message: string): void => {
    if (!isDebugEnabled()) return;
    writeLog(prefix, message);
  };
}

export function createWarnLog(prefix = "[gesp-plugin]"): LogFn {
  return (message: string): void => {
    writeLog(`${prefix} [WARN]`, message);
  };
}
