"use client";

import { useFormStatus } from "react-dom";
import Link from "next/link";
import { registerAction } from "./actions";
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
  async function handleSubmit(formData: FormData) {
    const username = formData.get("username");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!username || !password || !confirmPassword) {
      toast.error("请填写所有必填字段");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    if ((password as string).length < 6) {
      toast.error("密码至少6个字符");
      return;
    }

    if ((username as string).length < 3) {
      toast.error("用户名至少3个字符");
      return;
    }

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
          <CardDescription>填写信息注册学员账号</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6 p-3 bg-secondary/50 rounded-lg text-center text-sm text-muted-foreground">
            🎮 注册为学员
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
