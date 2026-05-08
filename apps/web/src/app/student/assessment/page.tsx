"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LevelSlider } from "@/components/assessment/level-slider";
import { ChevronDown, ChevronUp, Play } from "lucide-react";
import { startAssessment } from "@/lib/server-api";

export default function AssessmentStartPage() {
  const router = useRouter();
  const [level, setLevel] = useState(1);
  const [courseId, setCourseId] = useState("cpp");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [questionLimit, setQuestionLimit] = useState(5);
  const [timeLimit, setTimeLimit] = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleStart = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await startAssessment({
        course_id: courseId,
        start_level: level,
        config_question_limit: questionLimit,
        config_time_limit_min: timeLimit,
      });
      if (res.success && res.data?.token) {
        router.push(`/student/assessment/${res.data.token}`);
      } else {
        setError(res.message || "创建测评失败，请重试");
      }
    } catch {
      setError("网络错误，请检查后端是否启动");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 py-8">
      <div>
        <h1 className="text-2xl font-semibold">测评定级</h1>
        <p className="text-muted-foreground mt-1">AI 自适应测评，帮你找到最适合的起始级别</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>开始测评</CardTitle>
          <CardDescription>选择课程和预估级别开始测评</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>课程</Label>
            <Select value={courseId} onValueChange={(v) => v && setCourseId(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpp">C++ 编程</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <LevelSlider value={level} onChange={setLevel} />
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => setShowAdvanced(!showAdvanced)}>
            {showAdvanced ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            高级选项
          </Button>
          {showAdvanced && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-lg border">
              <div className="space-y-2">
                <Label>题目上限</Label>
                <Input type="number" min={3} max={30} value={questionLimit} onChange={e => setQuestionLimit(parseInt(e.target.value) || 5)} />
              </div>
              <div className="space-y-2">
                <Label>时间限制（分钟）</Label>
                <Input type="number" min={10} max={120} value={timeLimit} onChange={e => setTimeLimit(parseInt(e.target.value) || 30)} />
              </div>
            </div>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button className="w-full gap-2" size="lg" onClick={handleStart} disabled={loading}>
            <Play className="h-5 w-5" />
            {loading ? "正在准备测评..." : "开始测评"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}