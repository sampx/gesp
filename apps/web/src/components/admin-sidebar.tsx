"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  BarChart3,
  Settings,
  Menu,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { getCurrentUser, logout as logoutAction } from "@/lib/server-api";

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
  role: number;
}

const navItems = [
  { href: "/admin/dashboard", label: "仪表板", icon: LayoutDashboard },
  { href: "/admin/knowledge/points", label: "知识库", icon: BookOpen },
  { href: "/admin/students", label: "学员管理", icon: Users },
  { href: "/admin/analytics", label: "数据分析", icon: BarChart3 },
  { href: "/admin/settings", label: "设置", icon: Settings },
];

function getRoleLabel(role: number) {
  if (role >= 100) return "超级管理员";
  if (role >= 10) return "教员";
  return "学员";
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    getCurrentUser()
      .then((u) => {
        if (u) setUser(u);
      })
      .catch((err) => {
        console.error("Failed to fetch user info:", err);
      });
  }, []);

  const handleLogout = async () => {
    await logoutAction();
    window.location.href = "/login";
  };

  return (
    <aside
      className={cn(
        "border-r bg-card flex flex-col min-h-screen transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      <div className="p-4 border-b flex items-center justify-between">
        {!collapsed && <span className="font-semibold text-sm">管理后台</span>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed(!collapsed)}
        >
          <Menu className="h-4 w-4" />
        </Button>
      </div>
      <nav className="flex-1 py-2">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            pathname?.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-2.5 text-sm transition-colors",
                isActive
                  ? "bg-accent/10 text-primary font-medium border-l-2 border-primary"
                  : "text-muted-foreground hover:bg-secondary"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t p-3">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Avatar className="h-7 w-7">
                <AvatarFallback>
                  {user?.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-semibold truncate">
                {user?.username}
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {user ? getRoleLabel(user.role) : ""}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              登出
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Avatar className="h-7 w-7">
              <AvatarFallback>
                {user?.display_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}
