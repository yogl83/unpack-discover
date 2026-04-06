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

const statusLabels: Record<string, string> = {
  hypothesis: "Гипотеза", confirmed: "Подтверждена", in_progress: "В работе", resolved: "Решена", rejected: "Отклонена",
};
const priorityLabels: Record<string, string> = { low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический" };

export default function Needs() {
  const [search, setSearch] = useState("");
  const { canEdit } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["needs", search],
    queryFn: async () => {
      let q = supabase.from("partner_needs").select("*, partners(partner_name)").order("updated_at", { ascending: false });
      if (search) q = q.ilike("title", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Потребности партнеров</h1>
        {canEdit && <Button asChild><Link to="/needs/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link></Button>}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <p className="text-muted-foreground">Загрузка...</p> : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет потребностей</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Название</TableHead><TableHead>Партнер</TableHead><TableHead>Тип</TableHead>
              <TableHead>Статус</TableHead><TableHead>Приоритет</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(n => (
                <TableRow key={n.need_id}>
                  <TableCell><Link to={`/needs/${n.need_id}`} className="font-medium text-primary hover:underline">{n.title}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{(n.partners as any)?.partner_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{n.need_type || "—"}</TableCell>
                  <TableCell><Badge variant="secondary">{statusLabels[n.need_status || ""] || n.need_status || "—"}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{priorityLabels[n.priority_level || ""] || n.priority_level || "—"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
