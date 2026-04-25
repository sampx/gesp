import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordChangeForm } from "@/components/password-change-form";
import { Separator } from "@/components/ui/separator";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-lg font-semibold">设置</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">修改密码</CardTitle>
        </CardHeader>
        <CardContent>
          <PasswordChangeForm />
        </CardContent>
      </Card>
      <Separator />
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">系统配置</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">系统配置功能将在后续版本上线</p>
        </CardContent>
      </Card>
    </div>
  );
}
