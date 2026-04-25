"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AddUserDialog } from "@/components/add-user-dialog";
import { ResetPasswordDialog } from "@/components/reset-password-dialog";
import { getUsers, toggleUserStatus as toggleStatusAction } from "@/lib/server-api";

interface User {
  id: string;
  username: string;
  display_name: string;
  role: number;
  status: number;
  created_at: string;
}

function UserRoleBadge({ role }: { role: number }) {
  if (role === 100) {
    return (
      <Badge className="bg-purple-100 text-purple-700">超级管理员</Badge>
    );
  }
  if (role === 10) {
    return (
      <Badge className="bg-indigo-100 text-indigo-700">教员</Badge>
    );
  }
  return <Badge variant="secondary">学员</Badge>;
}

function UserStatusBadge({ status }: { status: number }) {
  if (status === 1) {
    return (
      <Badge
        variant="outline"
        className="text-green-600 border-green-200"
      >
        启用
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-red-600 border-red-200">
      禁用
    </Badge>
  );
}

export default function AdminStudentsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState("");
  const [resetUsername, setResetUsername] = useState("");

  const fetchUsers = async () => {
    try {
      const data = await getUsers();

      if (data.success) {
        setUsers(data.data.users);
      } else {
        toast.error(data.message || "获取用户列表失败");
      }
    } catch {
      toast.error("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (userId: string, currentStatus: number, username: string) => {
    try {
      const data = await toggleStatusAction(userId);

      if (data.success) {
        const action = currentStatus === 1 ? "禁用" : "启用";
        toast.success(`已${action}用户 ${username}`);
        fetchUsers();
      } else {
        toast.error(data.message || "操作失败");
      }
    } catch {
      toast.error("操作失败");
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">学员管理</h1>
        <Button onClick={() => setAddDialogOpen(true)}>添加用户</Button>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>用户名</TableHead>
            <TableHead>角色</TableHead>
            <TableHead>状态</TableHead>
            <TableHead>注册时间</TableHead>
            <TableHead>操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                <p className="text-muted-foreground">加载中...</p>
              </TableCell>
            </TableRow>
          ) : users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8">
                <p className="text-muted-foreground">暂无用户</p>
                <p className="text-sm text-muted-foreground mt-1">
                  点击「添加用户」按钮创建新学员或教员账号
                </p>
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.id}>
                <TableCell>{user.username}</TableCell>
                <TableCell>
                  <UserRoleBadge role={user.role} />
                </TableCell>
                <TableCell>
                  <UserStatusBadge status={user.status} />
                </TableCell>
                <TableCell>
                  {new Date(user.created_at).toLocaleDateString("zh-CN")}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        toggleStatus(user.id, user.status, user.username)
                      }
                    >
                      {user.status === 1 ? "禁用" : "启用"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setResetUserId(user.id);
                        setResetUsername(user.username);
                        setResetDialogOpen(true);
                      }}
                    >
                      重置密码
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AddUserDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchUsers}
      />
      <ResetPasswordDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        userId={resetUserId}
        username={resetUsername}
        onSuccess={fetchUsers}
      />
    </div>
  );
}
