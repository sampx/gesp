"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE } from "@gesp/shared";

export async function registerAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const roleStr = formData.get("role") as string;

  if (password !== confirmPassword) {
    return { error: "两次输入的密码不一致" };
  }

  const roleMap: Record<string, number> = {
    student: ROLE.STUDENT,
    teacher: ROLE.ADMIN,
  };
  const role = roleMap[roleStr] ?? ROLE.STUDENT;

  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

  let redirectPath = "";
  try {
    const res = await fetch(`${backendUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: data.message || "注册失败，请稍后重试" };
    }

    const rawCookie = res.headers.getSetCookie?.() || [];
    const sessionCookie = rawCookie.find((c: string) =>
      c.startsWith("session_id=")
    );
    if (sessionCookie) {
      const cookieStore = await cookies();
      const sessionId = sessionCookie.split(";")[0].split("=")[1];
      cookieStore.set("session_id", sessionId, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    const userRole = data.data?.user?.role;
    if (userRole >= ROLE.ADMIN) {
      redirectPath = "/admin/dashboard";
    } else {
      redirectPath = "/student/dashboard";
    }
  } catch {
    return { error: "注册失败，请稍后重试" };
  }

  if (redirectPath) redirect(redirectPath);
}
