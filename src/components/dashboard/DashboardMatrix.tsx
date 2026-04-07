import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface MatrixRow {
  partner_id: string;
  unit_id: string | null;
  partners: { partner_name: string } | null;
  miem_units: { unit_name: string } | null;
}

export function DashboardMatrix() {
  const { data: hypotheses } = useQuery({
    queryKey: ["dashboard-matrix"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaboration_hypotheses")
        .select("partner_id, unit_id, partners(partner_name), miem_units(unit_name)");
      if (error) throw error;
      return data as unknown as MatrixRow[];
    },
  });

  const matrix = useMemo(() => {
    if (!hypotheses?.length) return null;

    const partnerMap = new Map<string, string>();
    const unitMap = new Map<string, string>();
    const counts = new Map<string, number>();
    let maxCount = 0;

    for (const h of hypotheses) {
      if (!h.unit_id) continue;
      const pName = (h.partners as any)?.partner_name || "—";
      const uName = (h.miem_units as any)?.unit_name || "—";
      partnerMap.set(h.partner_id, pName);
      unitMap.set(h.unit_id, uName);

      const key = `${h.partner_id}|${h.unit_id}`;
      const c = (counts.get(key) || 0) + 1;
      counts.set(key, c);
      if (c > maxCount) maxCount = c;
    }

    const partners = Array.from(partnerMap.entries());
    const units = Array.from(unitMap.entries());

    return { partners, units, counts, maxCount };
  }, [hypotheses]);

  if (!matrix || matrix.partners.length === 0 || matrix.units.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Матрица: Партнёр × Подразделение МИЭМ</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm py-8 text-center">
            Недостаточно данных. Создайте гипотезы с привязкой к партнёрам и подразделениям.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getCellColor = (count: number) => {
    if (count === 0) return "bg-muted/30";
    const intensity = Math.min(count / matrix.maxCount, 1);
    if (intensity <= 0.33) return "bg-primary/20 text-primary";
    if (intensity <= 0.66) return "bg-primary/40 text-primary-foreground";
    return "bg-primary/80 text-primary-foreground";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Матрица: Партнёр × Подразделение МИЭМ</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left p-2 font-medium text-muted-foreground border-b">Партнёр / Подразделение</th>
              {matrix.units.map(([id, name]) => (
                <th key={id} className="p-2 font-medium text-muted-foreground border-b text-center min-w-[100px]">
                  <span className="text-xs leading-tight block">{name.length > 20 ? name.slice(0, 18) + "…" : name}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.partners.map(([pId, pName]) => (
              <tr key={pId} className="border-b last:border-0">
                <td className="p-2 font-medium">{pName}</td>
                {matrix.units.map(([uId]) => {
                  const count = matrix.counts.get(`${pId}|${uId}`) || 0;
                  return (
                    <td key={uId} className="p-1 text-center">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className={`mx-auto w-10 h-10 rounded-md flex items-center justify-center font-bold text-sm cursor-default transition-colors ${getCellColor(count)}`}>
                            {count || "—"}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{pName} × {matrix.units.find(([id]) => id === uId)?.[1]}</p>
                          <p className="text-xs font-bold">{count} гипотез(ы)</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
