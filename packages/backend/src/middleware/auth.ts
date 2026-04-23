import { Context, Next } from "hono";
import { ROLE } from "@gesp/shared";
import { forbidden, unauthorized } from "../utils/response";
import { db } from "../db";
import { sessions } from "../db/schema";
import { getCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";

// Base session validation (reused by all auth middleware)
async function validateSessionAndSetUser(c: Context): Promise<Response | void> {
  const sessionId = getCookie(c, "session_id");
  
  if (!sessionId) {
    return unauthorized(c, "No session");
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { user: true },
  });

  if (!session || session.expires_at < new Date()) {
    if (session) {
      await db.delete(sessions).where(eq(sessions.id, sessionId));
    }
    deleteCookie(c, "session_id");
    return unauthorized(c, "Session expired or invalid");
  }

  c.set("user", session.user);
  c.set("session", session);
}

// Exported session middleware for direct use (satisfies acceptance criteria)
export async function requireSession(c: Context, next: Next): Promise<Response | void> {
  const validationError = await validateSessionAndSetUser(c);
  if (validationError) return validationError;
  await next();
}

// StudentAuth: role >= 1 (any authenticated user)
export function StudentAuth() {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const validationError = await validateSessionAndSetUser(c);
    if (validationError) return validationError;

    const user = c.get("user");
    if (user.role < ROLE.STUDENT) {
      return forbidden(c, "Insufficient permissions");
    }
    await next();
  };
}

// AdminAuth: role >= 10
export function AdminAuth() {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const validationError = await validateSessionAndSetUser(c);
    if (validationError) return validationError;

    const user = c.get("user");
    if (user.role < ROLE.ADMIN) {
      return forbidden(c, "Admin access required");
    }
    await next();
  };
}

// RootAuth: role >= 100
export function RootAuth() {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const validationError = await validateSessionAndSetUser(c);
    if (validationError) return validationError;

    const user = c.get("user");
    if (user.role < ROLE.ROOT) {
      return forbidden(c, "Root access required");
    }
    await next();
  };
}