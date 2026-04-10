import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { hypothesisStatusLabels } from "@/lib/labels";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function Hypotheses() {
  const [search, setSearch] = useState("");
  const { canEdit } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["hypotheses", search],
    queryFn: async () => {
      let q = supabase.from("collaboration_hypotheses").select("*, partners(partner_name), partner_needs(title)").order("updated_at", { ascending: false });
      if (search) q = q.or(`title.ilike.%${search}%,rationale.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Гипотезы сотрудничества</h1>
        {canEdit && <Button asChild><Link to="/hypotheses/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link></Button>}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <TableSkeleton columns={5} />
      ) : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет гипотез</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Название</TableHead><TableHead>Партнер</TableHead><TableHead>Потребность</TableHead>
              <TableHead>Статус</TableHead><TableHead>Уверенность</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(h => (
                <TableRow key={h.hypothesis_id}>
                  <TableCell><Link to={`/hypotheses/${h.hypothesis_id}`} className="font-medium text-primary hover:underline">{h.title || "Без названия"}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{(h.partners as any)?.partner_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{(h.partner_needs as any)?.title || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{hypothesisStatusLabels[h.hypothesis_status || ""] || h.hypothesis_status || "—"}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{h.confidence_level || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
