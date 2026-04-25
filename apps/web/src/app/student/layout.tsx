import { ReactNode } from "react";
import { StudentNavbar } from "@/components/student-navbar";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="student" className="min-h-screen font-sans">
      <StudentNavbar />
      <div className="max-w-3xl mx-auto px-4 pb-20">{children}</div>
    </div>
  );
}
