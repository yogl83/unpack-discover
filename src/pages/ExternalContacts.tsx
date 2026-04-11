import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { contactKindLabels } from "@/lib/labels";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

const kindLabels = contactKindLabels;

export default function ExternalContacts() {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const [filterPartner, setFilterPartner] = useState("all");
  const [filterKind, setFilterKind] = useState("all");
  const [filterPrimary, setFilterPrimary] = useState("all");
  const { page, from, to, setPage, totalPages } = usePagination();

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ["all-external-contacts", debouncedSearch, filterKind, filterPrimary, page],
    queryFn: async () => {
      let q = supabase.from("contacts").select("*, partners(partner_name)", { count: "exact" }).order("full_name");
      if (debouncedSearch) q = q.or(`full_name.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      if (filterKind !== "all") q = q.eq("contact_kind", filterKind);
      if (filterPrimary === "yes") q = q.eq("is_primary", true);
      if (filterPrimary === "no") q = q.eq("is_primary", false);
      q = q.range(from, to);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });

  const contacts = result?.data;
  const pages = totalPages(result?.count || 0);

  const partners = Array.from(new Set(contacts?.map(c => (c.partners as any)?.partner_name).filter(Boolean))).sort();

  const filtered = filterPartner === "all"
    ? contacts
    : contacts?.filter(c => (c.partners as any)?.partner_name === filterPartner);

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Контакты</h1>
        {canEdit && (
          <Button onClick={() => navigate("/contacts/external/new")}>
            <Plus className="mr-1 h-4 w-4" />Добавить контакт
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по ФИО или email…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
        </div>
        <Select value={filterPartner} onValueChange={setFilterPartner}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Организация" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все организации</SelectItem>
            {partners.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterKind} onValueChange={v => { setFilterKind(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(kindLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPrimary} onValueChange={v => { setFilterPrimary(v); setPage(1); }}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Primary" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="yes">Основной</SelectItem>
            <SelectItem value="no">Не основной</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <TableSkeleton columns={7} />
      ) : !filtered?.length ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Нет контактов</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ФИО</TableHead>
                  <TableHead>Партнёр</TableHead>
                  <TableHead className="hidden md:table-cell">Должность</TableHead>
                  <TableHead className="hidden md:table-cell">Тип</TableHead>
                  <TableHead className="hidden lg:table-cell">Email</TableHead>
                  <TableHead className="hidden lg:table-cell">Телефон</TableHead>
                  <TableHead className="hidden md:table-cell">Основной</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered?.map(c => (
                  <TableRow key={c.contact_id}>
                    <TableCell>
                      <Link to={`/partners/${c.partner_id}/contacts/${c.contact_id}`} className="font-medium text-primary hover:underline">
                        {c.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link to={`/partners/${c.partner_id}`} className="text-muted-foreground hover:underline">
                        {(c.partners as any)?.partner_name || "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground hidden md:table-cell">{c.job_title || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline">{kindLabels[c.contact_kind] || c.contact_kind}</Badge></TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">{c.email || "—"}</TableCell>
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
