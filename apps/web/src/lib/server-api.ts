"use server";

import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:3000";

async function getSessionId(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get("session_id")?.value;
}

async function serverFetch(path: string, options?: RequestInit): Promise<Response> {
  const sessionId = await getSessionId();
  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      ...(sessionId ? { Cookie: `session_id=${sessionId}` } : {}),
    },
  });
}

export async function getCurrentUser() {
  try {
    const res = await serverFetch("/api/auth/me");
    if (!res.ok) return null;
    const data = await res.json();
    return data.data?.user ?? null;
  } catch {
    return null;
  }
}

export async function logout() {
  try {
    await serverFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Backend unreachable, still clear local cookie
  }
  const cookieStore = await cookies();
  cookieStore.delete("session_id");
}

export async function getUsers(page = 1, pageSize = 20) {
  const res = await serverFetch(`/api/admin/users?page=${page}&pageSize=${pageSize}`);
  return res.json();
}

export async function createUser(username: string, password: string, role: number) {
  const res = await serverFetch("/api/admin/users", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, role }),
  });
  return res.json();
}

export async function toggleUserStatus(userId: string) {
  const res = await serverFetch(`/api/admin/users/${userId}/status`, {
    method: "PUT",
  });
  return res.json();
}

export async function resetUserPassword(userId: string, newPassword: string) {
  const res = await serverFetch(`/api/admin/users/${userId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ new_password: newPassword }),
  });
  return res.json();
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const res = await serverFetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
  });
  return res.json();
}

export async function startAssessment(data: {
  course_id: string;
  start_level: number;
  config_question_limit?: number;
  config_time_limit_min?: number;
}) {
  const res = await serverFetch("/api/assessment/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function submitAnswer(data: {
  token: string;
  question_id: string;
  answer: string;
  time_spent_sec?: number;
}) {
  const res = await serverFetch("/api/assessment/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function getNextQuestion(token: string) {
  const res = await serverFetch(`/api/assessment/next-question?token=${token}`);
  return res.json();
}

export async function getAssessmentProgress(token: string) {
  const res = await serverFetch(`/api/assessment/progress?token=${token}`);
  return res.json();
}

export async function resumeAssessment(token: string) {
  const res = await serverFetch("/api/assessment/resume", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token }),
  });
  return res.json();
}
