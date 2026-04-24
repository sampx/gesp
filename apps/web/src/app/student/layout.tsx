import { ReactNode } from "react";

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme="student" className="min-h-screen font-sans">
      <div className="max-w-3xl mx-auto px-4 pb-20">
        {children}
      </div>
    </div>
  );
}
