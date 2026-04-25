import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordChangeForm } from "@/components/password-change-form";

export default function StudentSettingsPage() {
  return (
    <div className="py-6">
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>设置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">修改密码</h3>
            <PasswordChangeForm />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
