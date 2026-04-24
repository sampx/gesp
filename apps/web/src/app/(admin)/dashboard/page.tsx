import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, Users, FileQuestion, Book } from "lucide-react";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">管理仪表板</h1>
        <p className="text-sm text-muted-foreground mt-1">
          知识库系统概览
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="知识点" icon={<BookOpen className="h-5 w-5" />} />
        <StatCard title="教案" icon={<Book className="h-5 w-5" />} />
        <StatCard title="练习题" icon={<FileQuestion className="h-5 w-5" />} />
        <StatCard title="学员" icon={<Users className="h-5 w-5" />} />
      </div>

      {/* Placeholder: Phase 7 content */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">学员学习数据统计 — Phase 7 见！</p>
          </CardContent>
        </Card>
        <Card className="border-dashed">
          <CardContent className="py-8 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">AI Provider 配置 — Phase 7 见！</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  icon,
}: {
  title: string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-2xl font-bold">—</span>
        </div>
      </CardContent>
    </Card>
  );
}
