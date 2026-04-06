import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";

export default function Competencies() {
  const [search, setSearch] = useState("");
  const { canEdit } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["competencies", search],
    queryFn: async () => {
      let q = supabase.from("competencies").select("*, miem_units(unit_name)").order("competency_name");
      if (search) q = q.ilike("competency_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Компетенции</h1>
        {canEdit && <Button asChild><Link to="/competencies/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link></Button>}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? <p className="text-muted-foreground">Загрузка...</p> : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет компетенций</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Название</TableHead><TableHead>Коллектив</TableHead><TableHead>Тип</TableHead>
              <TableHead>Область</TableHead><TableHead>Зрелость</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {data.map(c => (
                <TableRow key={c.competency_id}>
                  <TableCell><Link to={`/competencies/${c.competency_id}`} className="font-medium text-primary hover:underline">{c.competency_name}</Link></TableCell>
                  <TableCell className="text-muted-foreground">{(c.miem_units as any)?.unit_name || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.competency_type || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.application_domain || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.maturity_level || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
