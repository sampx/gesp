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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
  { href: "/admin/dashboard", label: "仪表板", icon: LayoutDashboard },
  { href: "/admin/knowledge/points", label: "知识库", icon: BookOpen },
  { href: "/admin/students", label: "学员管理", icon: Users },
  { href: "/admin/analytics", label: "数据分析", icon: BarChart3 },
  { href: "/admin/settings", label: "设置", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "border-r bg-card flex flex-col transition-all duration-300",
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
    </aside>
  );
}
