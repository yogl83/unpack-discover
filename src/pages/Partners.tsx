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

const statusLabels: Record<string, string> = {
  new: "Новый", in_review: "На рассмотрении", in_progress: "В работе",
  active: "Активный", on_hold: "На паузе", archived: "Архив",
};
const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800", in_review: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-indigo-100 text-indigo-800", active: "bg-green-100 text-green-800",
  on_hold: "bg-orange-100 text-orange-800", archived: "bg-gray-100 text-gray-600",
};
const priorityLabels: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический",
};
const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800", medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800", critical: "bg-red-100 text-red-800",
};

export default function Partners() {
  const [search, setSearch] = useState("");
  const { canEdit } = useAuth();

  const { data: partners, isLoading } = useQuery({
    queryKey: ["partners", search],
    queryFn: async () => {
      let q = supabase.from("partner_overview").select("*").order("updated_at", { ascending: false });
      if (search) q = q.ilike("partner_name", `%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
  });

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

  // Also fetch drafts (not is_current) for partners without current profile
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
        <Input placeholder="Поиск по названию..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Загрузка...</p>
      ) : !partners?.length ? (
        <p className="text-muted-foreground py-8 text-center">Нет партнеров</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
             <TableRow>
                 <TableHead>Название</TableHead>
                 <TableHead>Профайл</TableHead>
                 <TableHead>Отрасль</TableHead>
                 <TableHead>Город</TableHead>
                 <TableHead>Статус</TableHead>
                 <TableHead>Приоритет</TableHead>
                 <TableHead className="text-right">Контакты</TableHead>
                 <TableHead className="text-right">Задачи</TableHead>
                 <TableHead className="text-right">Гипотезы</TableHead>
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
                   <TableCell>
                     <ProfileFreshnessBadge
                       profile={(() => {
                         const prof = getProfileForPartner(p.partner_id);
                         return prof ? { status: prof.status, is_current: prof.is_current, updated_at: prof.updated_at } : null;
                       })()}
                       compact
                     />
                   </TableCell>
                   <TableCell className="text-muted-foreground">{p.industry || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{p.city || "—"}</TableCell>
                  <TableCell>
                    {p.partner_status && (
                      <Badge variant="secondary" className={statusColors[p.partner_status] || ""}>
                        {statusLabels[p.partner_status] || p.partner_status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.priority_level && (
                      <Badge variant="secondary" className={priorityColors[p.priority_level] || ""}>
                        {priorityLabels[p.priority_level] || p.priority_level}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{p.contacts_count}</TableCell>
                  <TableCell className="text-right">{p.needs_count}</TableCell>
                  <TableCell className="text-right">{p.hypotheses_count}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
