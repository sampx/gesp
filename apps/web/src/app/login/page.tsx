"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction } from "./actions";
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
      {pending ? "登录中..." : "登录"}
    </Button>
  );
}

export default function LoginPage() {
  const [selectedRole, setSelectedRole] = useState<
    "student" | "teacher" | "admin"
  >("student");

  async function handleSubmit(formData: FormData) {
    formData.set("role", selectedRole);
    const result = await loginAction(formData);
    if (result?.error) {
      toast.error(result.error);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">GESP 智能学习系统</CardTitle>
          <CardDescription>选择你的角色登录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-6">
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
            <RoleCard
              role="admin"
              emoji="⚙️"
              label="管理员"
              selected={selectedRole === "admin"}
              onClick={() => setSelectedRole("admin")}
            />
          </div>

          <form action={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username">用户名</Label>
              <Input id="username" name="username" required />
            </div>
            <div>
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
              />
            </div>
            <SubmitButton />
          </form>

          <p className="text-xs text-muted-foreground text-center mt-4">
            选择角色后输入账号密码登录
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
