"use client";

interface RoleCardProps {
  role: "student" | "teacher" | "admin";
  emoji: string;
  label: string;
  selected: boolean;
  onClick: () => void;
}

export function RoleCard({
  role,
  emoji,
  label,
  selected,
  onClick,
}: RoleCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all cursor-pointer
        ${
          selected
            ? "border-amber-500 bg-amber-50 scale-[1.02] shadow-md"
            : "border-stone-200 bg-white hover:border-stone-300"
        }`}
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
