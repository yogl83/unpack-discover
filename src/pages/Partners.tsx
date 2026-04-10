import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ProfileFreshnessBadge } from "@/components/partner/ProfileFreshnessBadge";
import { partnerStatusLabels, partnerStatusColors, priorityLabels, priorityColors } from "@/lib/labels";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ErrorState } from "@/components/ui/error-state";
import { useDebounce } from "@/hooks/useDebounce";
import { usePagination } from "@/hooks/usePagination";
import { TablePagination } from "@/components/TablePagination";

export default function Partners() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search);
  const { canEdit } = useAuth();
  const { page, from, to, setPage, totalPages } = usePagination();

  const { data: result, isLoading, isError, refetch } = useQuery({
    queryKey: ["partners", debouncedSearch, page],
    queryFn: async () => {
      let q = supabase.from("partner_overview").select("*", { count: "exact" }).order("updated_at", { ascending: false });
      if (debouncedSearch) q = q.or(`partner_name.ilike.%${debouncedSearch}%,industry.ilike.%${debouncedSearch}%,city.ilike.%${debouncedSearch}%`);
      q = q.range(from, to);
      const { data, error, count } = await q;
      if (error) throw error;
      return { data: data || [], count: count || 0 };
    },
  });

  const partners = result?.data;
  const pages = totalPages(result?.count || 0);

  // Fetch current profiles for freshness indicators
  const partnerIds = partners?.map(p => p.partner_id).filter(Boolean) as string[] | undefined;
  const { data: profiles } = useQuery({
    queryKey: ["partner-profiles-freshness", partnerIds],
    queryFn: async () => {
      if (!partnerIds?.length) return [];
      const { data, error } = await supabase
        .from("partner_profiles")
        .select("profile_id, partner_id, status, is_current, updated_at")
        .in("partner_id", partnerIds)
        .in("status", ["approved", "draft", "review"])
        .eq("is_current", true);
      if (error) throw error;
      return data;
    },
    enabled: !!partnerIds?.length,
  });

  const { data: drafts } = useQuery({
    queryKey: ["partner-profiles-drafts", partnerIds],
    queryFn: async () => {
      if (!partnerIds?.length) return [];
      const { data, error } = await supabase
        .from("partner_profiles")
        .select("profile_id, partner_id, status, is_current, updated_at")
        .in("partner_id", partnerIds)
        .in("status", ["draft", "review"]);
      if (error) throw error;
      return data;
    },
    enabled: !!partnerIds?.length,
  });

  const getProfileForPartner = (partnerId: string | null) => {
    if (!partnerId) return null;
    const current = profiles?.find(p => p.partner_id === partnerId);
    if (current) return current;
    const draft = drafts?.find(p => p.partner_id === partnerId);
    return draft || null;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Партнеры</h1>
        {canEdit && (
          <Button asChild>
            <Link to="/partners/new"><Plus className="mr-2 h-4 w-4" />Добавить</Link>
          </Button>
        )}
      </div>
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Поиск по названию, отрасли, городу..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
      </div>
      {isError ? (
        <ErrorState onRetry={refetch} />
      ) : isLoading ? (
        <TableSkeleton columns={9} rows={6} />
      ) : !partners?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет партнеров</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-x-auto">
            <Table>
              <TableHeader>
               <TableRow>
                   <TableHead>Название</TableHead>
                   <TableHead className="hidden md:table-cell">Профайл</TableHead>
                   <TableHead className="hidden md:table-cell">Отрасль</TableHead>
                   <TableHead className="hidden lg:table-cell">Город</TableHead>
                   <TableHead>Статус</TableHead>
                   <TableHead className="hidden md:table-cell">Приоритет</TableHead>
                   <TableHead className="text-right hidden lg:table-cell">Контакты</TableHead>
                   <TableHead className="text-right hidden lg:table-cell">Задачи</TableHead>
                   <TableHead className="text-right hidden lg:table-cell">Гипотезы</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {partners.map((p) => (
                  <TableRow key={p.partner_id} className="cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <Link to={`/partners/${p.partner_id}`} className="font-medium text-primary hover:underline">
                        {p.partner_name}
                      </Link>
                     </TableCell>
                     <TableCell className="hidden md:table-cell">
                       <ProfileFreshnessBadge
                         profile={(() => {
                           const prof = getProfileForPartner(p.partner_id);
                           return prof ? { status: prof.status, is_current: prof.is_current, updated_at: prof.updated_at } : null;
                         })()}
                         compact
                       />
                     </TableCell>
                     <TableCell className="text-muted-foreground hidden md:table-cell">{p.industry || "—"}</TableCell>
                    <TableCell className="text-muted-foreground hidden lg:table-cell">{p.city || "—"}</TableCell>
                    <TableCell>
                      {p.partner_status && (
                        <Badge variant="secondary" className={partnerStatusColors[p.partner_status] || ""}>
                          {partnerStatusLabels[p.partner_status] || p.partner_status}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {p.priority_level && (
                        <Badge variant="secondary" className={priorityColors[p.priority_level] || ""}>
                          {priorityLabels[p.priority_level] || p.priority_level}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{p.contacts_count}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{p.needs_count}</TableCell>
                    <TableCell className="text-right hidden lg:table-cell">{p.hypotheses_count}</TableCell>
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
