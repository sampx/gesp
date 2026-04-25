import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="admin" className="h-screen flex overflow-hidden">
      <AdminSidebar />
      <div className="flex-1 min-w-0 overflow-y-auto">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
