import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sankey, Tooltip, Layer, Rectangle } from "recharts";
import { useMemo } from "react";

interface HypothesisRow {
  partner_id: string;
  need_id: string;
  unit_id: string | null;
  partners: { partner_name: string } | null;
  partner_needs: { title: string } | null;
  miem_units: { unit_name: string } | null;
}

function CustomNode({ x, y, width, height, index, payload }: any) {
  const colors = ["hsl(213,74%,45%)", "hsl(38,92%,50%)", "hsl(142,71%,45%)", "hsl(280,60%,55%)"];
  const depth = payload?.depth ?? 0;
  const fill = colors[depth % colors.length];

  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.9} rx={3} />
      {height > 14 && (
        <text
          x={x + width + 6}
          y={y + height / 2}
          textAnchor="start"
          dominantBaseline="central"
          className="fill-foreground text-[11px]"
        >
          {payload?.name?.length > 25 ? payload.name.slice(0, 23) + "…" : payload?.name}
        </text>
      )}
    </Layer>
  );
}

export function DashboardSankey() {
  const { data: hypotheses } = useQuery({
    queryKey: ["dashboard-sankey"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaboration_hypotheses")
        .select("partner_id, need_id, unit_id, partners(partner_name), partner_needs(title), miem_units(unit_name)");
      if (error) throw error;
      return data as unknown as HypothesisRow[];
    },
  });

  const sankeyData = useMemo(() => {
    if (!hypotheses?.length) return null;

    const nodeMap = new Map<string, number>();
    const nodes: { name: string }[] = [];
    const linkMap = new Map<string, number>();

    const getNodeIndex = (key: string, name: string) => {
      if (!nodeMap.has(key)) {
        nodeMap.set(key, nodes.length);
        nodes.push({ name });
      }
      return nodeMap.get(key)!;
    };

    const addLink = (source: number, target: number) => {
      const key = `${source}-${target}`;
      linkMap.set(key, (linkMap.get(key) || 0) + 1);
    };

    for (const h of hypotheses) {
      const partnerName = (h.partners as any)?.partner_name || "Без партнёра";
      const needTitle = (h.partner_needs as any)?.title || "Без потребности";
      const unitName = h.unit_id ? ((h.miem_units as any)?.unit_name || "Без коллектива") : null;

      const pIdx = getNodeIndex(`p-${h.partner_id}`, partnerName);
      const nIdx = getNodeIndex(`n-${h.need_id}`, needTitle);

      addLink(pIdx, nIdx);

      // Hypotheses as implicit link between needs and units
      if (unitName) {
        const uIdx = getNodeIndex(`u-${h.unit_id}`, unitName);
        addLink(nIdx, uIdx);
      }
    }

    const links = Array.from(linkMap.entries()).map(([key, value]) => {
      const [source, target] = key.split("-").map(Number);
      return { source, target, value };
    });

    return { nodes, links };
  }, [hypotheses]);

  if (!sankeyData || sankeyData.nodes.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Поток: Организации → Потребности → Коллективы</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm py-8 text-center">
            Недостаточно данных для построения диаграммы. Добавьте гипотезы со связями.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Поток: Организации → Потребности → Коллективы</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[600px]">
          <Sankey
            width={800}
            height={Math.max(300, sankeyData.nodes.length * 40)}
            data={sankeyData}
            node={<CustomNode />}
            nodePadding={30}
            nodeWidth={12}
            linkCurvature={0.5}
            margin={{ top: 10, right: 160, bottom: 10, left: 10 }}
            link={{ stroke: "hsl(213,74%,55%)", strokeOpacity: 0.2 }}
          >
            <Tooltip />
          </Sankey>
        </div>
      </CardContent>
    </Card>
  );
}
