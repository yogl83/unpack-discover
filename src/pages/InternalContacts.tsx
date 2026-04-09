import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export default function InternalContacts() {
  const { canEdit } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [filterUnit, setFilterUnit] = useState("all");
  const [filterRole, setFilterRole] = useState("all");

  const { data: contacts, isLoading } = useQuery({
    queryKey: ["all-internal-contacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_contacts")
        .select("*, miem_units(unit_name)")
        .order("full_name");
      if (error) throw error;
      return data;
    },
  });

  const units = Array.from(new Set(contacts?.map(c => (c.miem_units as any)?.unit_name).filter(Boolean))).sort();
  const roles = Array.from(new Set(contacts?.map(c => c.contact_role).filter(Boolean))).sort();

  const filtered = contacts?.filter(c => {
    const q = search.toLowerCase();
    if (q && !c.full_name.toLowerCase().includes(q) && !(c.email || "").toLowerCase().includes(q)) return false;
    if (filterUnit !== "all" && (c.miem_units as any)?.unit_name !== filterUnit) return false;
    if (filterRole !== "all" && c.contact_role !== filterRole) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Внутренние контакты</h1>
        {canEdit && (
          <Button onClick={() => navigate("/contacts/internal/new")}>
            <Plus className="mr-1 h-4 w-4" />Добавить контакт
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Поиск по ФИО или email…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
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
                <TableHead>Коллектив</TableHead>
                <TableHead>Роль</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Телефон</TableHead>
                <TableHead>Основной</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(c => (
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
                  <TableCell className="text-muted-foreground">{c.contact_role || "—"}</TableCell>
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
