import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Props {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  accentColor?: string;
}

export function StudentFeatureCard({
  title,
  description,
  icon,
  href,
  accentColor = "border-amber-500",
}: Props) {
  return (
    <Link href={href}>
      <Card
        className={cn(
          "cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border-l-4",
          accentColor
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center gap-3">
            <div className="text-2xl">{icon}</div>
            <CardTitle className="text-lg">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <CardDescription>{description}</CardDescription>
        </CardContent>
      </Card>
    </Link>
  );
}
