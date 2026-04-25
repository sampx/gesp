"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction } from "./actions";
import { RoleCard } from "@/components/role-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "注册中..." : "注册"}
    </Button>
  );
}

export default function RegisterPage() {
  const [selectedRole, setSelectedRole] = useState<"student" | "teacher">(
    "student"
  );

  async function handleSubmit(formData: FormData) {
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if (password.length < 6) {
      toast.error("密码至少6个字符");
      return;
    }

    if ((formData.get("username") as string).length < 3) {
      toast.error("用户名至少3个字符");
      return;
    }

    formData.set("role", selectedRole);
    const result = await registerAction(formData);
    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">创建账号</CardTitle>
          <CardDescription>选择角色并填写信息注册</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-6">
            <RoleCard
              role="student"
              emoji="🎮"
              label="学员"
              selected={selectedRole === "student"}
              onClick={() => setSelectedRole("student")}
            />
            <RoleCard
              role="teacher"
              emoji="📚"
              label="教员"
              selected={selectedRole === "teacher"}
              onClick={() => setSelectedRole("teacher")}
            />
          </div>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                name="username"
                placeholder="请输入用户名"
                required
                minLength={3}
                maxLength={20}
              />
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="请输入密码"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword">确认密码</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="请再次输入密码"
                required
                minLength={6}
              />
            </div>
            <SubmitButton />
          </form>

          <div className="text-center text-sm mt-4">
            <Link href="/login" className="text-primary hover:underline">
              已有账号？去登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
