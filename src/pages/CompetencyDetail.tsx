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

export default function CompetencyDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: units } = useQuery({ queryKey: ["units-select"], queryFn: async () => { const { data } = await supabase.from("miem_units").select("unit_id, unit_name").order("unit_name"); return data || []; } });

  const { data: item, isLoading } = useQuery({
    queryKey: ["competency", id],
    queryFn: async () => { const { data, error } = await supabase.from("competencies").select("*").eq("competency_id", id!).single(); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    competency_name: "", unit_id: "", competency_type: "", description: "",
    application_domain: "", maturity_level: "", methods_and_tools: "",
    evidence_of_experience: "", education_link: "", notes: "",
  });

  useEffect(() => { if (item) setForm(Object.fromEntries(Object.keys(form).map(k => [k, (item as any)[k] || ""])) as any); }, [item]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.competency_name || !form.unit_id) { toast.error("Заполните обязательные поля"); throw new Error("required"); }
      if (isNew) { const { error } = await supabase.from("competencies").insert(form as any); if (error) throw error; }
      else { const { error } = await supabase.from("competencies").update(form as any).eq("competency_id", id!); if (error) throw error; }
    },
    onSuccess: () => { toast.success(isNew ? "Создано" : "Сохранено"); qc.invalidateQueries({ queryKey: ["competencies"] }); navigate("/competencies"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("competencies").delete().eq("competency_id", id!); if (error) throw error; },
    onSuccess: () => { toast.success("Удалено"); navigate("/competencies"); },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/competencies"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новая компетенция" : form.competency_name}</h1>
        {!isNew && isAdmin && <Button variant="destructive" size="sm" onClick={() => { if (confirm("Удалить?")) del.mutate(); }}><Trash2 className="mr-1 h-4 w-4" />Удалить</Button>}
      </div>
      <Card>
        <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Название *</Label><Input value={form.competency_name} onChange={e => set("competency_name", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2">
            <Label>Коллектив *</Label>
            <Select value={form.unit_id} onValueChange={v => set("unit_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{units?.map(u => <SelectItem key={u.unit_id} value={u.unit_id}>{u.unit_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Тип</Label><Input value={form.competency_type} onChange={e => set("competency_type", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Область применения</Label><Input value={form.application_domain} onChange={e => set("application_domain", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Уровень зрелости</Label><Input value={form.maturity_level} onChange={e => set("maturity_level", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Описание</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} disabled={!canEdit} rows={3} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Методы и инструменты</Label><Textarea value={form.methods_and_tools} onChange={e => set("methods_and_tools", e.target.value)} disabled={!canEdit} rows={2} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Подтверждение опыта</Label><Textarea value={form.evidence_of_experience} onChange={e => set("evidence_of_experience", e.target.value)} disabled={!canEdit} rows={2} /></div>
          <div className="space-y-2"><Label>Ссылка на образование</Label><Input value={form.education_link} onChange={e => set("education_link", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Заметки</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} /></div>
        </CardContent>
      </Card>
      {canEdit && <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}</Button>}
    </div>
  );
}
