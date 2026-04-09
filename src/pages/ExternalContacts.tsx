import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

const kindLabels: Record<string, string> = {
  official: "Официальный", warm: "Тёплый", operational: "Оперативный",
  decision_maker: "ЛПР", technical: "Технический", other: "Другой",
};

export default function ExternalContacts() {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterPartner, setFilterPartner] = useState("all");
  const [filterKind, setFilterKind] = useState("all");
  const [filterPrimary, setFilterPrimary] = useState("all");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["all-external-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contacts")
        .select("*, partners(partner_name)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const partners = Array.from(new Set(contacts?.map(c => (c.partners as any)?.partner_name).filter(Boolean))).sort();

  const filtered = contacts?.filter(c => {
    const q = search.toLowerCase();
    if (q && !c.full_name.toLowerCase().includes(q) && !(c.email || "").toLowerCase().includes(q)) return false;
    if (filterPartner !== "all" && (c.partners as any)?.partner_name !== filterPartner) return false;
    if (filterKind !== "all" && c.contact_kind !== filterKind) return false;
    if (filterPrimary === "yes" && !c.is_primary) return false;
    if (filterPrimary === "no" && c.is_primary) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Внешние контакты</h1>
        {canEdit && (
          <Button onClick={() => navigate("/contacts/external/new")}>
            <Plus className="mr-1 h-4 w-4" />Добавить контакт
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по ФИО или email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterPartner} onValueChange={setFilterPartner}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Партнёр" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все партнёры</SelectItem>
            {partners.map(p => <SelectItem key={p} value={p!}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterKind} onValueChange={setFilterKind}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Тип" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все типы</SelectItem>
            {Object.entries(kindLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterPrimary} onValueChange={setFilterPrimary}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Primary" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="yes">Основной</SelectItem>
            <SelectItem value="no">Не основной</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Загрузка…</p>
      ) : !filtered?.length ? (
        <p className="text-muted-foreground text-sm py-6 text-center">Нет контактов</p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Партнёр</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead>Тип</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Основной</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
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
                  <TableCell className="text-muted-foreground">{c.job_title || "—"}</TableCell>
                  <TableCell><Badge variant="outline">{kindLabels[c.contact_kind] || c.contact_kind}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                  <TableCell>{c.is_primary ? <Badge>Да</Badge> : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
