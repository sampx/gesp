"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ResetPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  username: string;
  onSuccess: () => void;
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userId,
  username,
  onSuccess,
}: ResetPasswordDialogProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("密码至少6个字符");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }

    setLoading(true);

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
      const sessionId = document.cookie
        .split(";")
        .find((c) => c.trim().startsWith("session_id="))
        ?.split("=")[1];

      const res = await fetch(
        `${backendUrl}/api/admin/users/${userId}/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(sessionId ? { Cookie: `session_id=${sessionId}` } : {}),
          },
          body: JSON.stringify({ new_password: newPassword }),
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success(`已重置 ${username} 的密码`);
        setNewPassword("");
        setConfirmPassword("");
        onSuccess();
        onOpenChange(false);
      } else {
        toast.error(data.message || "操作失败");
      }
    } catch {
      toast.error("操作失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重置密码</DialogTitle>
          <DialogDescription>为用户 {username} 设置新密码</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reset-new-password">新密码</Label>
            <Input
              id="reset-new-password"
              type="password"
              placeholder="请输入新密码（至少6位）"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reset-confirm-password">确认新密码</Label>
            <Input
              id="reset-confirm-password"
              type="password"
              placeholder="请再次输入新密码"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? "提交中..." : "重置密码"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
