import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">数据分析</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            数据分析
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-12">
          <p className="text-muted-foreground">数据分析功能即将上线</p>
          <p className="text-sm text-muted-foreground mt-2">
            该功能将在后续版本中实现，敬请期待
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
