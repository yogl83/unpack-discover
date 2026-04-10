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
import { format } from "date-fns";
import { nextStepStatusLabels } from "@/lib/labels";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function NextSteps() {
  const [search, setSearch] = useState("");
  const { canEdit } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["next-steps", search],
    queryFn: async () => {
      let q = supabase.from("next_steps").select("*, partners(partner_name)").order("due_date", { ascending: true, nullsFirst: false });
      if (search) q = q.or(`action_title.ilike.%${search}%,action_description.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Следующие шаги</h1>
        {canEdit && <Button asChild><Link to="/next-steps/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link></Button>}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <TableSkeleton columns={4} />
      ) : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет шагов</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Действие</TableHead><TableHead>Партнер</TableHead><TableHead>Статус</TableHead><TableHead>Срок</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(s => (
                <TableRow key={s.next_step_id}>
                  <TableCell><Link to={`/next-steps/${s.next_step_id}`} className="font-medium text-primary hover:underline">{s.action_title}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{(s.partners as any)?.partner_name || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{nextStepStatusLabels[s.next_step_status || ""] || s.next_step_status || "—"}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{s.due_date ? format(new Date(s.due_date), "dd.MM.yyyy") : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
