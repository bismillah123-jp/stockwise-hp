import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
  loading: boolean;
}

export function StatCard({ title, value, icon: Icon, color, loading }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-5 w-5 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">
          {loading ? (
            <div className="animate-pulse bg-muted h-8 w-16 rounded" />
          ) : (
            value.toLocaleString('id-ID')
          )}
        </div>
      </CardContent>
    </Card>
  );
}
