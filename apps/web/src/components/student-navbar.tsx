"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
  role: number;
}

async function handleLogout() {
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
  await fetch(`${backendUrl}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  document.cookie =
    "session_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  window.location.href = "/login";
}

export function StudentNavbar() {
  const [user, setUser] = useState<UserInfo | null>(null);

  useEffect(() => {
    const backendUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3000";
    fetch(`${backendUrl}/api/auth/me`, {
      credentials: "include",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.data?.user) {
          setUser(data.data.user);
        }
      })
      .catch(() => {});
  }, []);

  return (
    <header className="h-14 flex items-center justify-between px-4 border-b bg-card sticky top-0 z-50">
      <span className="font-semibold text-base">GESP 智能学习</span>

      {user && (
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-2 py-1 hover:bg-secondary transition-colors outline-none">
            <Avatar className="h-8 w-8">
              <AvatarFallback>{user.display_name?.[0] || "?"}</AvatarFallback>
            </Avatar>
            <span className="text-sm hidden sm:inline">
              {user.display_name}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem>
              <Link
                href="/student/settings"
                className="flex items-center gap-2 w-full"
              >
                <Settings className="h-4 w-4" />
                设置
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              登出
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </header>
  );
}
