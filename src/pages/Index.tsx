import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ClipboardList, Lightbulb, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export default function Index() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [partners, needs, hypotheses, steps] = await Promise.all([
        supabase.from("partners").select("partner_id", { count: "exact", head: true }),
        supabase.from("partner_needs").select("need_id", { count: "exact", head: true }),
        supabase.from("collaboration_hypotheses").select("hypothesis_id", { count: "exact", head: true }),
        supabase.from("next_steps").select("next_step_id", { count: "exact", head: true }),
      ]);
      return {
        partners: partners.count ?? 0,
        needs: needs.count ?? 0,
        hypotheses: hypotheses.count ?? 0,
        steps: steps.count ?? 0,
      };
    },
  });

  const cards = [
    { title: "Партнеры", value: stats?.partners ?? "—", icon: Building2, color: "text-primary" },
    { title: "Задачи", value: stats?.needs ?? "—", icon: ClipboardList, color: "text-amber-500" },
    { title: "Гипотезы", value: stats?.hypotheses ?? "—", icon: Lightbulb, color: "text-emerald-500" },
    { title: "Следующие шаги", value: stats?.steps ?? "—", icon: ArrowRight, color: "text-violet-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-5 w-5 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
