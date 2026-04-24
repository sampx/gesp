import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForbiddenPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle>🚫 403 — 无权访问</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">你没有权限访问此页面</p>
        </CardContent>
      </Card>
    </div>
  );
}
