import { StudentFeatureCard } from "@/components/student-feature-card";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, FileQuestion, Code, TrendingUp } from "lucide-react";

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">👋 你好，同学！</h1>
        <p className="text-muted-foreground mt-1">
          选择下方入口开始学习吧
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StudentFeatureCard
          title="测评定级"
          description="AI 自适应测评，找到你的起始级别"
          icon={<FileQuestion className="h-8 w-8 text-amber-500" />}
          href="/student/assessment"
          accentColor="border-amber-500"
        />
        <StudentFeatureCard
          title="教学讲解"
          description="AI 生成知识点讲解，不懂就问"
          icon={<BookOpen className="h-8 w-8 text-teal-500" />}
          href="/student/learning"
          accentColor="border-teal-500"
        />
        <StudentFeatureCard
          title="练习判题"
          description="AI 即时判题，帮你找出问题"
          icon={<Code className="h-8 w-8 text-indigo-500" />}
          href="/student/practice"
          accentColor="border-indigo-500"
        />
      </div>

      {/* Placeholder: Phase 6 content */}
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-muted-foreground">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">个人学习进度图表 — Phase 6 见！</p>
        </CardContent>
      </Card>
    </div>
  );
}
