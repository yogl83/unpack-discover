import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

export default function InternalContacts() {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterRole, setFilterRole] = useState("all");
  const { page, from, to, setPage, totalPages } = usePagination();

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ["all-internal-contacts", debouncedSearch, page],
    queryFn: async () => {
      let q = supabase.from("unit_contacts").select("*, miem_units!unit_contacts_unit_id_fkey(unit_name)", { count: "exact" }).order("full_name");
      if (debouncedSearch) q = q.or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      q = q.range(from, to);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });

  const contacts = result?.data;
  const pages = totalPages(result?.count || 0);

  const units = Array.from(new Set(contacts?.map(c => (c.miem_units as any)?.unit_name).filter(Boolean))).sort();
  const roles = Array.from(new Set(contacts?.map(c => c.contact_role).filter(Boolean))).sort();

  const filtered = contacts?.filter(c => {
    if (filterUnit !== "all" && (c.miem_units as any)?.unit_name !== filterUnit) return false;
    if (filterRole !== "all" && c.contact_role !== filterRole) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Контакты</h1>
        {canEdit && (
          <Button onClick={() => navigate("/contacts/internal/new")}>
            <Plus className="mr-1 h-4 w-4" />Добавить контакт
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по ФИО или email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterUnit} onValueChange={setFilterUnit}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Коллектив" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все коллективы</SelectItem>
            {units.map(u => <SelectItem key={u} value={u!}>{u}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Роль" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все роли</SelectItem>
            {roles.map(r => <SelectItem key={r} value={r!}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <TableSkeleton columns={6} />
      ) : !filtered?.length ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Нет контактов</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Коллектив</TableHead>
                  <TableHead className="hidden md:table-cell">Роль</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Телефон</TableHead>
                  <TableHead className="hidden md:table-cell">Основной</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map(c => (
                  <TableRow key={c.unit_contact_id}>
                    <TableCell>
                      <Link to={`/units/${c.unit_id}/contacts/${c.unit_contact_id}`} className="font-medium text-primary hover:underline">
                        {c.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/units/${c.unit_id}`} className="text-muted-foreground hover:underline">
                        {(c.miem_units as any)?.unit_name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{c.contact_role || "—"}</TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{c.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">{c.phone || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{c.is_primary ? <Badge>Да</Badge> : "—"}</TableCell>
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
