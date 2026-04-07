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

export default function HypothesisDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: partners } = useQuery({ queryKey: ["partners-select"], queryFn: async () => { const { data } = await supabase.from("partners").select("partner_id, partner_name").order("partner_name"); return data || []; } });
  const { data: allNeeds } = useQuery({ queryKey: ["needs-select"], queryFn: async () => { const { data } = await supabase.from("partner_needs").select("need_id, title, partner_id").order("title"); return data || []; } });
  const { data: units } = useQuery({ queryKey: ["units-select"], queryFn: async () => { const { data } = await supabase.from("miem_units").select("unit_id, unit_name").order("unit_name"); return data || []; } });
  const { data: allCompetencies } = useQuery({ queryKey: ["competencies-select"], queryFn: async () => { const { data } = await supabase.from("competencies").select("competency_id, competency_name, unit_id").order("competency_name"); return data || []; } });

  const { data: item, isLoading } = useQuery({
    queryKey: ["hypothesis", id],
    queryFn: async () => { const { data, error } = await supabase.from("collaboration_hypotheses").select("*").eq("hypothesis_id", id!).single(); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    title: "", partner_id: "", need_id: "", unit_id: "", competency_id: "",
    hypothesis_status: "new", confidence_level: "", relevance_score: "",
    rationale: "", recommended_entry_point: "", recommended_collaboration_format: "", notes: "",
  });

  useEffect(() => {
    if (item) setForm(Object.fromEntries(Object.keys(form).map(k => [k, String((item as any)[k] ?? "")])) as any);
  }, [item]);

  // Filter needs by selected partner
  const filteredNeeds = form.partner_id
    ? allNeeds?.filter(n => n.partner_id === form.partner_id) || []
    : allNeeds || [];

  // Filter competencies by selected unit
  const filteredCompetencies = form.unit_id
    ? allCompetencies?.filter(c => c.unit_id === form.unit_id) || []
    : allCompetencies || [];

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        relevance_score: form.relevance_score ? Number(form.relevance_score) : null,
        unit_id: form.unit_id || null,
        competency_id: form.competency_id || null,
      };
      if (!payload.partner_id || !payload.need_id) { toast.error("Заполните обязательные поля"); throw new Error("required"); }
      if (isNew) { const { error } = await supabase.from("collaboration_hypotheses").insert(payload as any); if (error) throw error; }
      else { const { error } = await supabase.from("collaboration_hypotheses").update(payload as any).eq("hypothesis_id", id!); if (error) throw error; }
    },
    onSuccess: () => { toast.success(isNew ? "Создано" : "Сохранено"); qc.invalidateQueries({ queryKey: ["hypotheses"] }); navigate("/hypotheses"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("collaboration_hypotheses").delete().eq("hypothesis_id", id!); if (error) throw error; },
    onSuccess: () => { toast.success("Удалено"); qc.invalidateQueries({ queryKey: ["hypotheses"] }); navigate("/hypotheses"); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: string) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      // Reset dependent selects
      if (k === "partner_id" && v !== p.partner_id) next.need_id = "";
      if (k === "unit_id" && v !== p.unit_id) next.competency_id = "";
      return next;
    });
  };

  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/hypotheses"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новая гипотеза" : form.title || "Гипотеза"}</h1>
        {!isNew && isAdmin && (
          <Button variant="destructive" size="sm" onClick={() => { if (confirm("Удалить гипотезу?")) del.mutate(); }}>
            <Trash2 className="mr-1 h-4 w-4" />Удалить
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Название</Label>
            <Input value={form.title} onChange={e => set("title", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Партнер *</Label>
            <Select value={form.partner_id} onValueChange={v => set("partner_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{partners?.map(p => <SelectItem key={p.partner_id} value={p.partner_id}>{p.partner_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Потребность *</Label>
            <Select value={form.need_id} onValueChange={v => set("need_id", v)} disabled={!canEdit || !form.partner_id}>
              <SelectTrigger><SelectValue placeholder={form.partner_id ? "Выберите" : "Сначала выберите партнера"} /></SelectTrigger>
              <SelectContent>{filteredNeeds.map(n => <SelectItem key={n.need_id} value={n.need_id}>{n.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Подразделение МИЭМ</Label>
            <Select value={form.unit_id} onValueChange={v => set("unit_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{units?.map(u => <SelectItem key={u.unit_id} value={u.unit_id}>{u.unit_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Компетенция</Label>
            <Select value={form.competency_id} onValueChange={v => set("competency_id", v)} disabled={!canEdit || !form.unit_id}>
              <SelectTrigger><SelectValue placeholder={form.unit_id ? "Выберите" : "Сначала выберите подразделение"} /></SelectTrigger>
              <SelectContent>{filteredCompetencies.map(c => <SelectItem key={c.competency_id} value={c.competency_id}>{c.competency_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={form.hypothesis_status} onValueChange={v => set("hypothesis_status", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Новая</SelectItem>
                <SelectItem value="testing">Тестируется</SelectItem>
                <SelectItem value="confirmed">Подтверждена</SelectItem>
                <SelectItem value="rejected">Отклонена</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Уровень уверенности</Label>
            <Select value={form.confidence_level} onValueChange={v => set("confidence_level", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Низкий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Оценка релевантности (0–10)</Label>
            <Input type="number" min="0" max="10" step="0.5" value={form.relevance_score} onChange={e => set("relevance_score", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Формат сотрудничества</Label>
            <Select value={form.recommended_collaboration_format} onValueChange={v => set("recommended_collaboration_format", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="research">Исследование</SelectItem>
                <SelectItem value="consulting">Консалтинг</SelectItem>
                <SelectItem value="development">Разработка</SelectItem>
                <SelectItem value="education">Обучение</SelectItem>
                <SelectItem value="internship">Стажировка</SelectItem>
                <SelectItem value="other">Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Точка входа</Label>
            <Input value={form.recommended_entry_point} onChange={e => set("recommended_entry_point", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Обоснование</Label>
            <Textarea value={form.rationale} onChange={e => set("rationale", e.target.value)} disabled={!canEdit} rows={3} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Заметки</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <Button onClick={() => save.mutate()} disabled={!form.partner_id || !form.need_id || save.isPending}>
          <Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}
        </Button>
      )}
    </div>
  );
}
