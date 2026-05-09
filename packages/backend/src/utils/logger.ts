import { appendFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkgDir = resolve(__dirname, "../..");
const logDir = resolve(pkgDir, process.env.LOG_DIR ?? "./logs");
const logFile = resolve(logDir, process.env.LOG_FILE ?? "gesp.log");
const minLevel = process.env.LOG_LEVEL ?? "info";

const LEVELS: Record<string, number> = {
  trace: 10,
  debug: 20,
  info: 30,
  warn: 40,
  error: 50,
  fatal: 60,
};

mkdirSync(logDir, { recursive: true });

function timeString(): string {
  return new Date().toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

function formatMeta(meta: Record<string, unknown>): string {
  const keys = Object.keys(meta);
  if (keys.length === 0) return "";
  const parts: string[] = [];
  for (const [k, v] of Object.entries(meta)) {
    if (k === "msg") continue;
    if (v instanceof Error) {
      parts.push(`${k}=${v.message}`);
    } else if (typeof v === "object" && v !== null) {
      parts.push(`${k}=${JSON.stringify(v)}`);
    } else if (typeof v === "string" && v.length > 80) {
      parts.push(`${k}=${v.slice(0, 80)}...`);
    } else {
      parts.push(`${k}=${v}`);
    }
  }
  return parts.length > 0 ? " " + parts.join(" ") : "";
}

function writeLine(level: string, meta: Record<string, unknown> | undefined, msg: string): void {
  const metaObj = meta ?? {};
  const line = `${timeString()} [${level.toUpperCase()}]${formatMeta(metaObj)} ${msg}\n`;
  process.stdout.write(line);
  try { appendFileSync(logFile, line); } catch { /* ignore */ }
}

function shouldLog(levelNum: number): boolean {
  const threshold = LEVELS[minLevel] ?? 30;
  return levelNum >= threshold;
}

function log(level: string, levelNum: number, ...args: any[]): void {
  if (!shouldLog(levelNum)) return;

  let meta: Record<string, unknown> | undefined;
  let msg: string;

  if (args.length === 0) return;
  if (args.length === 1 && typeof args[0] === "string") {
    msg = args[0];
  } else if (args.length === 1 && typeof args[0] === "object") {
    const obj = args[0] as Record<string, unknown>;
    meta = obj;
    const msgVal = obj.msg;
    msg = typeof msgVal === "string" ? msgVal : "";
  } else if (args.length >= 2) {
    meta = typeof args[0] === "object" ? args[0] : undefined;
    msg = typeof args[1] === "string" ? args[1] : args.slice(1).join(" ");
  } else {
    return;
  }

  writeLine(level, meta, msg);
}

export const logger = {
  trace: (...args: any[]) => log("trace", 10, ...args),
  debug: (...args: any[]) => log("debug", 20, ...args),
  info: (...args: any[]) => log("info", 30, ...args),
  warn: (...args: any[]) => log("warn", 40, ...args),
  error: (...args: any[]) => log("error", 50, ...args),
  fatal: (...args: any[]) => log("fatal", 60, ...args),
};
