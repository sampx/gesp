"use client";

import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ProgressBarProps {
  currentLevel: number;
  totalAnswered: number;
  totalCorrect: number;
  questionLimit: number;
}

export function ProgressBar({ currentLevel, totalAnswered, totalCorrect, questionLimit }: ProgressBarProps) {
  const pct = Math.min((totalAnswered / questionLimit) * 100, 100);
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Lv.{currentLevel}</Badge>
          <span className="text-muted-foreground">第 {totalAnswered + 1} 题</span>
        </div>
        <span className="text-muted-foreground">正确 {totalCorrect}/{totalAnswered}</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}