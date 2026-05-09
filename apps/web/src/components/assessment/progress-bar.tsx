"use client";

import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

interface ProgressBarProps {
  currentLevel: number;
  currentQuestionNumber: number;
  totalAnswered: number;
  totalCorrect: number;
  questionLimit: number;
  remainingQuestions: number;
  configTimeLimitMin: number;
  remainingTimeSec: number;
  startedAt: string;
  state: "LOADING_QUESTION" | "ANSWERING" | "JUDGING" | "SCORING" | "FEEDBACK" | "DONE";
}

function formatTime(seconds: number): string {
  if (seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function ProgressBar({
  currentLevel,
  currentQuestionNumber,
  totalAnswered,
  totalCorrect,
  questionLimit,
  remainingQuestions,
  configTimeLimitMin,
  remainingTimeSec,
  startedAt,
  state,
}: ProgressBarProps) {
  const pct = questionLimit > 0 ? Math.min((totalAnswered / questionLimit) * 100, 100) : 0;

  // Client-side ticking countdown derived from backend values
  const [tickRemaining, setTickRemaining] = useState<number>(remainingTimeSec);

  useEffect(() => {
    if (state === "DONE" || !startedAt || configTimeLimitMin <= 0) {
      setTickRemaining(remainingTimeSec);
      return;
    }
    // Calculate base expiry from backend values for drift correction
    const startTime = new Date(startedAt).getTime();
    const totalLimitMs = configTimeLimitMin * 60 * 1000;
    const expiryMs = startTime + totalLimitMs;

    const interval = setInterval(() => {
      const nowMs = Date.now();
      const remaining = Math.max(0, (expiryMs - nowMs) / 1000);
      setTickRemaining(remaining);
      if (remaining <= 0) clearInterval(interval);
    }, 1000);

    // Set initial value immediately
    const nowMs = Date.now();
    setTickRemaining(Math.max(0, (expiryMs - nowMs) / 1000));

    return () => clearInterval(interval);
  }, [startedAt, configTimeLimitMin, state, remainingTimeSec]);

  // Use server-provided remainingTimeSec as initial/base, tick for smooth countdown
  const displayRemaining = tickRemaining ?? remainingTimeSec;
  const totalTimeMin = configTimeLimitMin;

  // Question number: during FEEDBACK show the just-answered question, otherwise current
  const displayQuestionNum = state === "FEEDBACK" || state === "JUDGING" || state === "SCORING"
    ? currentQuestionNumber
    : currentQuestionNumber;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Lv.{currentLevel}</Badge>
          <span className="text-muted-foreground">第 {displayQuestionNum} 题</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-muted-foreground">正确 {totalCorrect}/{totalAnswered}</span>
          {questionLimit > 0 && (
            <span className="text-muted-foreground text-xs">
              共{questionLimit}题 · 剩{remainingQuestions}题
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Progress value={pct} className="h-2 flex-1" />
        {totalTimeMin > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatTime(displayRemaining)}</span>
            <span className="text-muted-foreground/50">/ {totalTimeMin}min</span>
          </div>
        )}
      </div>
    </div>
  );
}