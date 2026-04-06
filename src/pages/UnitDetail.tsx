import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function UnitDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: item, isLoading } = useQuery({
    queryKey: ["unit", id],
    queryFn: async () => { const { data, error } = await supabase.from("miem_units").select("*").eq("unit_id", id!).single(); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    unit_name: "", unit_type: "", lead_name: "", team_summary: "", research_area: "",
    business_problem_focus: "", application_domain: "", industry_fit: "", end_customer_fit: "",
    value_chain_role: "", readiness_level: "", discussion_readiness: "", notes: "",
  });

  useEffect(() => { if (item) setForm(Object.fromEntries(Object.keys(form).map(k => [k, (item as any)[k] || ""])) as any); }, [item]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.unit_name) { toast.error("Укажите название"); throw new Error("required"); }
      if (isNew) { const { error } = await supabase.from("miem_units").insert(form as any); if (error) throw error; }
      else { const { error } = await supabase.from("miem_units").update(form as any).eq("unit_id", id!); if (error) throw error; }
    },
    onSuccess: () => { toast.success(isNew ? "Создано" : "Сохранено"); qc.invalidateQueries({ queryKey: ["units"] }); navigate("/units"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("miem_units").delete().eq("unit_id", id!); if (error) throw error; },
    onSuccess: () => { toast.success("Удалено"); navigate("/units"); },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/units"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новый коллектив" : form.unit_name}</h1>
        {!isNew && isAdmin && <Button variant="destructive" size="sm" onClick={() => { if (confirm("Удалить?")) del.mutate(); }}><Trash2 className="mr-1 h-4 w-4" />Удалить</Button>}
      </div>
      <Card>
        <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Название *</Label><Input value={form.unit_name} onChange={e => set("unit_name", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2">
            <Label>Тип</Label>
            <Select value={form.unit_type} onValueChange={v => set("unit_type", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="lab">Лаборатория</SelectItem><SelectItem value="project_group">Проектная группа</SelectItem>
                <SelectItem value="center">Центр</SelectItem><SelectItem value="department">Департамент</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Руководитель</Label><Input value={form.lead_name} onChange={e => set("lead_name", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Область исследований</Label><Input value={form.research_area} onChange={e => set("research_area", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Область применения</Label><Input value={form.application_domain} onChange={e => set("application_domain", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Отрасль</Label><Input value={form.industry_fit} onChange={e => set("industry_fit", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Уровень готовности</Label><Input value={form.readiness_level} onChange={e => set("readiness_level", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Описание команды</Label><Textarea value={form.team_summary} onChange={e => set("team_summary", e.target.value)} disabled={!canEdit} rows={3} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Фокус бизнес-проблем</Label><Textarea value={form.business_problem_focus} onChange={e => set("business_problem_focus", e.target.value)} disabled={!canEdit} rows={3} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Заметки</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} /></div>
        </CardContent>
      </Card>
      {canEdit && <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}</Button>}
    </div>
  );
}
