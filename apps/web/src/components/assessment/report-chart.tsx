"use client";

import { Progress } from "@/components/ui/progress";

interface KnowledgeStat {
  total: number;
  correct: number;
}

interface ReportChartProps {
  knowledgeStats: Record<string, KnowledgeStat>;
}

export function ReportChart({ knowledgeStats }: ReportChartProps) {
  const entries = Object.entries(knowledgeStats).sort((a, b) => b[1].total - a[1].total);
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">暂无知识点统计</p>;

  return (
    <div className="space-y-3">
      {entries.map(([kp, stat]) => {
        const pct = stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0;
        return (
          <div key={kp} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium">{kp}</span>
              <span className="text-muted-foreground">{stat.correct}/{stat.total} ({pct}%)</span>
            </div>
            <Progress value={pct} className="h-3" />
          </div>
        );
      })}
    </div>
  );
}