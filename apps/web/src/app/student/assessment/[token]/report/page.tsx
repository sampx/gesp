"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Clock, Target, ArrowRight, RefreshCw, BookOpen } from "lucide-react";
import { ReportChart } from "@/components/assessment/report-chart";
import { getAssessmentProgress } from "@/lib/server-api";

export default function AssessmentReportPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAssessmentProgress(params.token)
      .then(res => { if (res.success) setData(res.data); })
      .finally(() => setLoading(false));
  }, [params.token]);

  if (loading) {
    return (
      <div className="space-y-6 py-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="py-16 text-center space-y-4">
        <p className="text-muted-foreground">报告数据加载失败</p>
        <Button variant="outline" onClick={() => router.push("/student/assessment")}>返回测评首页</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">测评报告</h1>
        <p className="text-muted-foreground mt-1">你的测评结果和学习建议</p>
      </div>

      {/* Result card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" /> 定级结果
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center">
            <Badge className="text-3xl px-8 py-4 font-bold">Lv.{data.final_level || data.current_level}</Badge>
          </div>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-2xl font-semibold">{data.total_answered}</p>
              <p className="text-sm text-muted-foreground">答题数</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">{data.total_correct}</p>
              <p className="text-sm text-muted-foreground">正确数</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Knowledge breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" /> 知识点正确率
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ReportChart knowledgeStats={data.knowledge_stats || {}} />
        </CardContent>
      </Card>

      {/* Evaluation */}
      {data.evaluation && (
        <Card>
          <CardHeader>
            <CardTitle>AI 综合评价</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
              {data.evaluation}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Separator />
      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="flex-1 gap-2" size="lg" onClick={() => router.push("/student/learning")}>
          <BookOpen className="h-5 w-5" /> 开始学习
        </Button>
        <Button variant="outline" className="flex-1 gap-2" size="lg" onClick={() => router.push("/student/assessment")}>
          <RefreshCw className="h-5 w-5" /> 再测一次
        </Button>
      </div>
    </div>
  );
}