import { Context, Next } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import { ROLE } from "@gesp/shared";
import { unauthorized } from "../utils/response";

const SESSION_TTL = {
  student: 60 * 60, // 1 hour in seconds
  admin: 24 * 60 * 60, // 24 hours in seconds
  root: 24 * 60 * 60,
};

function getTTL(role: number): number {
  if (role === ROLE.STUDENT) return SESSION_TTL.student;
  return SESSION_TTL.admin;
}

export async function createSession(c: Context, userId: string, role: number): Promise<string> {
  const sessionId = crypto.randomUUID();
  const ttl = getTTL(role);
  const expiresAt = new Date(Date.now() + ttl * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    user_id: userId,
    created_at: new Date(),
    expires_at: expiresAt,
    role,
  });

  setCookie(c, "session_id", sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "Strict",
    maxAge: ttl,
    path: "/",
  });

  return sessionId;
}

export async function validateSession(c: Context, next: Next): Promise<Response | void> {
  const sessionId = getCookie(c, "session_id");
  
  if (!sessionId) {
    return unauthorized(c, "No session cookie");
  }

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId),
    with: { user: true },
  });

  if (!session) {
    deleteCookie(c, "session_id");
    return unauthorized(c, "Session not found");
  }

  if (session.expires_at < new Date()) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    deleteCookie(c, "session_id");
    return unauthorized(c, "Session expired");
  }

  // Store user and session in context
  c.set("user", session.user);
  c.set("session", session);
  
  return next();
}

export async function destroySession(c: Context): Promise<void> {
  const sessionId = getCookie(c, "session_id");
  
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
    deleteCookie(c, "session_id");
  }
}

// Extend Hono context type
declare module "hono" {
  interface ContextVariableMap {
    user: typeof users.$inferSelect;
    session: typeof sessions.$inferSelect;
  }
}