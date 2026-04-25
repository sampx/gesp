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
import { getCurrentUser, logout as logoutAction } from "@/lib/server-api";

interface UserInfo {
  id: number;
  username: string;
  display_name: string;
  role: number;
}

export function StudentNavbar() {
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
