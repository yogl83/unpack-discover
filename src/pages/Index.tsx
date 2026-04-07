import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, ClipboardList, Lightbulb, ArrowRight, Users2, Brain } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardSankey } from "@/components/dashboard/DashboardSankey";
import { DashboardMatrix } from "@/components/dashboard/DashboardMatrix";
import { UnitSankey } from "@/components/dashboard/UnitSankey";

export default function Index() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [partners, needs, hypotheses, steps, units, competencies] = await Promise.all([
        supabase.from("partners").select("partner_id", { count: "exact", head: true }),
        supabase.from("partner_needs").select("need_id", { count: "exact", head: true }),
        supabase.from("collaboration_hypotheses").select("hypothesis_id", { count: "exact", head: true }),
        supabase.from("next_steps").select("next_step_id", { count: "exact", head: true }),
        supabase.from("miem_units").select("unit_id", { count: "exact", head: true }),
        supabase.from("competencies").select("competency_id", { count: "exact", head: true }),
      ]);
      return {
        partners: partners.count ?? 0,
        needs: needs.count ?? 0,
        hypotheses: hypotheses.count ?? 0,
        steps: steps.count ?? 0,
        units: units.count ?? 0,
        competencies: competencies.count ?? 0,
      };
    },
  });

  const cards = [
    { title: "Партнёры", value: stats?.partners ?? "—", icon: Building2, color: "text-primary" },
    { title: "Потребности", value: stats?.needs ?? "—", icon: ClipboardList, color: "text-amber-500" },
    { title: "Гипотезы", value: stats?.hypotheses ?? "—", icon: Lightbulb, color: "text-emerald-500" },
    { title: "Шаги", value: stats?.steps ?? "—", icon: ArrowRight, color: "text-violet-500" },
    { title: "Подразделения", value: stats?.units ?? "—", icon: Users2, color: "text-sky-500" },
    { title: "Компетенции", value: stats?.competencies ?? "—", icon: Brain, color: "text-rose-500" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Дашборд</h1>

      {/* KPI Cards */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.title}</CardTitle>
              <c.icon className={`h-4 w-4 ${c.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{c.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Sankey: Partners → Needs → Hypotheses → Units */}
      <DashboardSankey />

      {/* Matrix: Partner × Unit */}
      <DashboardMatrix />

      {/* Sankey: Units → Competencies → Hypotheses */}
      <UnitSankey />
    </div>
  );
}
