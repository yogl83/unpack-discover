import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sankey, Tooltip, Layer, Rectangle } from "recharts";
import { useMemo } from "react";

interface Row {
  unit_id: string | null;
  competency_id: string | null;
  hypothesis_id: string;
  miem_units: { unit_name: string } | null;
  competencies: { competency_name: string } | null;
}

function CustomNode({ x, y, width, height, index, payload }: any) {
  const colors = ["hsl(280,60%,55%)", "hsl(340,65%,50%)", "hsl(142,71%,45%)"];
  const depth = payload?.depth ?? 0;
  const fill = colors[depth % colors.length];

  return (
    <Layer key={`unode-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={fill} fillOpacity={0.9} rx={3} />
      {height > 14 && (
        <text
          x={x + width + 6}
          y={y + height / 2}
          textAnchor="start"
          dominantBaseline="central"
          className="fill-foreground text-[11px]"
        >
          {payload?.name?.length > 30 ? payload.name.slice(0, 28) + "…" : payload?.name}
        </text>
      )}
    </Layer>
  );
}

export function UnitSankey() {
  const { data } = useQuery({
    queryKey: ["dashboard-unit-sankey"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaboration_hypotheses")
        .select("unit_id, competency_id, hypothesis_id, miem_units(unit_name), competencies(competency_name)");
      if (error) throw error;
      return data as unknown as Row[];
    },
  });

  const sankeyData = useMemo(() => {
    if (!data?.length) return null;

    const withUnit = data.filter(d => d.unit_id);
    if (!withUnit.length) return null;

    const nodeMap = new Map<string, number>();
    const nodes: { name: string }[] = [];
    const linkMap = new Map<string, number>();

    const getIdx = (key: string, name: string) => {
      if (!nodeMap.has(key)) {
        nodeMap.set(key, nodes.length);
        nodes.push({ name });
      }
      return nodeMap.get(key)!;
    };

    const addLink = (s: number, t: number) => {
      const k = `${s}-${t}`;
      linkMap.set(k, (linkMap.get(k) || 0) + 1);
    };

    for (const h of withUnit) {
      const unitName = (h.miem_units as any)?.unit_name || "Коллектив";
      const uIdx = getIdx(`u-${h.unit_id}`, unitName);

      if (h.competency_id) {
        const compName = (h.competencies as any)?.competency_name || "Компетенция";
        const cIdx = getIdx(`c-${h.competency_id}`, compName);
        addLink(uIdx, cIdx);

        // Competency → Hypothesis (aggregate as "Гипотезы")
        const hIdx = getIdx("h-agg", "Гипотезы");
        addLink(cIdx, hIdx);
      } else {
        // Unit directly → Hypotheses
        const hIdx = getIdx("h-agg", "Гипотезы");
        addLink(uIdx, hIdx);
      }
    }

    if (nodes.length < 2) return null;

    const links = Array.from(linkMap.entries()).map(([key, value]) => {
      const [source, target] = key.split("-").map(Number);
      return { source, target, value };
    });

    return { nodes, links };
  }, [data]);

  if (!sankeyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Поток: Коллективы → Компетенции → Гипотезы</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm py-8 text-center">
            Недостаточно данных. Привяжите компетенции к гипотезам.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Поток: Коллективы → Компетенции → Гипотезы</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="min-w-[600px]">
          <Sankey
            width={800}
            height={Math.max(250, sankeyData.nodes.length * 40)}
            data={sankeyData}
            node={<CustomNode />}
            nodePadding={30}
            nodeWidth={12}
            linkCurvature={0.5}
            margin={{ top: 10, right: 180, bottom: 10, left: 10 }}
            link={{ stroke: "hsl(280,60%,55%)", strokeOpacity: 0.2 }}
          >
            <Tooltip />
          </Sankey>
        </div>
      </CardContent>
    </Card>
  );
}
