import { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="admin" className="min-h-screen flex">
      <AdminSidebar />
      <div className="flex-1 min-w-0">
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
