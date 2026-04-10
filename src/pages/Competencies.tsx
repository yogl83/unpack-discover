import { useState } from "react";
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

export default function Competencies() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const { canEdit } = useAuth();
  const { page, from, to, setPage, totalPages } = usePagination();

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ["competencies", debouncedSearch, page],
    queryFn: async () => {
      let q = supabase.from("competencies").select("*, miem_units(unit_name)", { count: "exact" }).order("competency_name");
      if (debouncedSearch) q = q.ilike("competency_name", `%${debouncedSearch}%`);
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
        <h1 className="text-2xl font-bold">Компетенции</h1>
        {canEdit && <Button asChild><Link to="/competencies/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link></Button>}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <TableSkeleton columns={5} />
      ) : !data?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет компетенций</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Название</TableHead><TableHead>Коллектив</TableHead><TableHead className="hidden md:table-cell">Тип</TableHead>
                <TableHead className="hidden md:table-cell">Область</TableHead><TableHead className="hidden lg:table-cell">Зрелость</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {data.map(c => (
                  <TableRow key={c.competency_id}>
                    <TableCell><Link to={`/competencies/${c.competency_id}`} className="font-medium text-primary hover:underline">{c.competency_name}</Link></TableCell>
                    <TableCell className="text-muted-foreground">{(c.miem_units as any)?.unit_name || "—"}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{c.competency_type || "—"}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{c.application_domain || "—"}</TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">{c.maturity_level || "—"}</TableCell>
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
