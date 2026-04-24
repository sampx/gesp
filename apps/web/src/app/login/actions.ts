"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ROLE } from "@gesp/shared";

export async function loginAction(formData: FormData) {
  const role = formData.get("role") as string;
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  // Map frontend role to backend role expectation
  const roleMap: Record<string, number[]> = {
    student: [ROLE.STUDENT], // 1
    teacher: [ROLE.ADMIN], // 10
    admin: [ROLE.ROOT], // 100
  };

  const backendUrl = process.env.BACKEND_URL || "http://localhost:3000";

  try {
    const res = await fetch(`${backendUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      return { error: "用户名或密码错误" }; // generic, no enumeration
    }

    // Extract session_id from Set-Cookie in response
    const rawCookie = res.headers.getSetCookie?.() || [];
    const sessionCookie = rawCookie.find((c: string) =>
      c.startsWith("session_id=")
    );

    if (sessionCookie) {
      const cookieStore = await cookies();
      // Parse session_id value
      const sessionId = sessionCookie.split(";")[0].split("=")[1];
      cookieStore.set("session_id", sessionId, {
        path: "/",
        httpOnly: true,
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    // Role-based redirect
    const user = data.data?.user;
    const userRole = user?.role;

    if (userRole >= ROLE.ROOT) {
      redirect("/admin/dashboard");
    } else if (userRole >= ROLE.ADMIN) {
      redirect("/admin/dashboard");
    } else {
      redirect("/student/dashboard");
    }
  } catch {
    return { error: "用户名或密码错误" }; // generic on network error too
  }
}
