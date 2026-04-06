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

export default function EvidencePage() {
  const [search, setSearch] = useState("");
  const { canEdit } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["evidence", search],
    queryFn: async () => {
      let q = supabase.from("evidence").select("*, partners(partner_name), sources(title)").order("created_at", { ascending: false });
      if (search) q = q.ilike("field_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Подтверждения</h1>
        {canEdit && <Button asChild><Link to="/evidence/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link></Button>}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по полю..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <p className="text-muted-foreground">Загрузка...</p> : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет подтверждений</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Тип сущности</TableHead><TableHead>Поле</TableHead><TableHead>Значение</TableHead>
              <TableHead>Партнер</TableHead><TableHead>Источник</TableHead><TableHead>Уверенность</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(e => (
                <TableRow key={e.evidence_id}>
                  <TableCell><Link to={`/evidence/${e.evidence_id}`} className="font-medium text-primary hover:underline">{e.entity_type}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{e.field_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground max-w-48 truncate">{e.field_value || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{(e.partners as any)?.partner_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{(e.sources as any)?.title || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{e.confidence_level || "—"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
