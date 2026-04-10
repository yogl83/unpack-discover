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
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ErrorState } from "@/components/ui/error-state";

export default function Sources() {
  const [search, setSearch] = useState("");
  const { canEdit } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["sources", search],
    queryFn: async () => {
      let q = supabase.from("sources").select("*, partners(partner_name)").order("updated_at", { ascending: false });
      if (search) q = q.or(`title.ilike.%${search}%,publisher.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Источники</h1>
        {canEdit && <Button asChild><Link to="/sources/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link></Button>}
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
        <p className="text-muted-foreground py-8 text-center">Нет источников</p>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Название</TableHead><TableHead>Партнер</TableHead><TableHead>Тип</TableHead>
              <TableHead>Надёжность</TableHead><TableHead>Издатель</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(s => (
                <TableRow key={s.source_id}>
                  <TableCell><Link to={`/sources/${s.source_id}`} className="font-medium text-primary hover:underline">{s.title}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{(s.partners as any)?.partner_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.source_type || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{s.source_reliability || "—"}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{s.publisher || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
