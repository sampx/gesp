"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, FileText, Trash2 } from "lucide-react";

export interface SessionSummary {
  id: string;
  token: string;
  status: "in_progress" | "completed" | "abandoned";
  start_level: number;
  current_level: number;
  final_level: number | null;
  total_answered: number;
  total_correct: number;
  started_at: string;
  completed_at: string | null;
}

interface SessionHistoryListProps {
  sessions: SessionSummary[];
  onContinue: (token: string) => void;
  onViewReport: (token: string) => void;
  onDelete: (sessionId: string) => void;
  actionLoading?: string | null;
}

const statusConfig: Record<
  SessionSummary["status"],
  { label: string; variant: "default" | "secondary" | "destructive" }
> = {
  in_progress: { label: "进行中", variant: "default" },
  completed: { label: "已完成", variant: "secondary" },
  abandoned: { label: "已放弃", variant: "destructive" },
};

function formatTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function SessionHistoryList({
  sessions,
  onContinue,
  onViewReport,
  onDelete,
  actionLoading,
}: SessionHistoryListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        还没有测评记录，开始你的第一次测评吧！
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => {
        const cfg = statusConfig[session.status];
        const level =
          session.status === "completed"
            ? session.final_level ?? session.current_level
            : session.current_level;
        const isLoading = actionLoading === session.id;

        return (
          <Card key={session.id} size="sm">
            <CardContent className="flex items-center gap-4 flex-wrap">
              <Badge variant={cfg.variant}>{cfg.label}</Badge>

              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Lv.{level}</span>
                  <span className="text-muted-foreground">
                    {session.total_correct}/{session.total_answered} 题
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatTime(session.started_at)}
                  {session.completed_at && ` → ${formatTime(session.completed_at)}`}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(session.status === "in_progress" ||
                  session.status === "abandoned") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => onContinue(session.token)}
                    disabled={isLoading}
                  >
                    <Play className="h-3.5 w-3.5" />
                    继续测评
                  </Button>
                )}

                {session.status === "completed" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => onViewReport(session.token)}
                    disabled={isLoading}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    查看报告
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={() => onDelete(session.id)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
