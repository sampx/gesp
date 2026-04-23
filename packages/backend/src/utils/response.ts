import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiResponse } from "@gesp/shared";

export function success<T>(c: Context, data: T, message = "Success"): Response {
  return c.json<ApiResponse<T>>({
    success: true,
    message,
    data,
  });
}

export function error(c: Context, message: string, status: ContentfulStatusCode = 400): Response {
  return c.json<ApiResponse<never>>({
    success: false,
    message,
  }, status);
}

export function unauthorized(c: Context, message = "Unauthorized"): Response {
  return error(c, message, 401);
}

export function forbidden(c: Context, message = "Forbidden"): Response {
  return error(c, message, 403);
}