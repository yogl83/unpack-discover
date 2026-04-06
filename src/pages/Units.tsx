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

export default function Units() {
  const [search, setSearch] = useState("");
  const { canEdit } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["units", search],
    queryFn: async () => {
      let q = supabase.from("unit_overview").select("*").order("unit_name");
      if (search) q = q.ilike("unit_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Коллективы МИЭМ</h1>
        {canEdit && <Button asChild><Link to="/units/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link></Button>}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <p className="text-muted-foreground">Загрузка...</p> : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет коллективов</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Название</TableHead><TableHead>Тип</TableHead><TableHead>Руководитель</TableHead>
              <TableHead>Область</TableHead><TableHead className="text-right">Компетенции</TableHead>
              <TableHead className="text-right">Гипотезы</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(u => (
                <TableRow key={u.unit_id}>
                  <TableCell><Link to={`/units/${u.unit_id}`} className="font-medium text-primary hover:underline">{u.unit_name}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{u.unit_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.lead_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{u.research_area || "—"}</TableCell>
                  <TableCell className="text-right">{u.competencies_count}</TableCell>
                  <TableCell className="text-right">{u.linked_hypotheses_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
