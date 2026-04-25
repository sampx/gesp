"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE } from "@gesp/shared";

export async function registerAction(formData: FormData) {
  const username = formData.get("username");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!username || !password || !confirmPassword) {
    return { error: "请填写所有必填字段" };
  }

  if (password !== confirmPassword) {
    return { error: "两次输入的密码不一致" };
  }

  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

  let redirectPath = "";
  try {
    const res = await fetch(`${backendUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role: ROLE.STUDENT }),
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

    redirectPath = "/student/dashboard";
  } catch (err) {
    console.error("Registration failed:", err);
    return { error: "注册失败，请稍后重试" };
  }

  if (redirectPath) redirect(redirectPath);
}
