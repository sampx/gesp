import type { MiddlewareHandler } from "hono";
import { logger } from "../utils/logger";

export const requestLogger: MiddlewareHandler = async (c, next) => {
  const start = Date.now();
  await next();
  const duration_ms = Date.now() - start;
  const status = c.res.status;

  // Security: only log method, path, status, duration - no headers or body
  const logData = {
    method: c.req.method,
    path: c.req.path,
    status,
    duration_ms,
  };

  if (status >= 500) {
    logger.error(logData, "Request failed");
  } else if (status >= 400) {
    logger.warn(logData, "Client error");
  } else {
    logger.info(logData, "Request completed");
  }
};