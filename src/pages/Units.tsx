import { useState } from "react";
import { unitTypeLabels } from "@/lib/labels";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

export default function Units() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const { canEdit } = useAuth();
  const { page, from, to, setPage, totalPages } = usePagination();

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ["units", debouncedSearch, page],
    queryFn: async () => {
      let q = supabase.from("unit_overview").select("*", { count: "exact" }).order("unit_name");
      if (debouncedSearch) q = q.or(`unit_name.ilike.%${debouncedSearch}%,research_area.ilike.%${debouncedSearch}%`);
      q = q.range(from, to);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });

  const data = result?.data;
  const pages = totalPages(result?.count || 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Коллективы</h1>
        {canEdit && <Button asChild><Link to="/units/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link></Button>}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <TableSkeleton columns={6} />
      ) : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет коллективов</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Название</TableHead><TableHead className="hidden md:table-cell">Тип</TableHead><TableHead className="hidden md:table-cell">Руководитель</TableHead>
                <TableHead className="hidden lg:table-cell">Область</TableHead><TableHead className="text-right">Компетенции</TableHead>
                <TableHead className="text-right hidden md:table-cell">Гипотезы</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map(u => (
                  <TableRow key={u.unit_id}>
                    <TableCell><Link to={`/units/${u.unit_id}`} className="font-medium text-primary hover:underline">{u.unit_name}</Link></TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{unitTypeLabels[u.unit_type] || u.unit_type || "—"}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{u.lead_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">{u.research_area || "—"}</TableCell>
                    <TableCell className="text-right">{u.competencies_count}</TableCell>
                    <TableCell className="text-right hidden md:table-cell">{u.linked_hypotheses_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <TablePagination page={page} totalPages={pages} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
