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

export default function NeedDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: partners } = useQuery({
    queryKey: ["partners-select"],
    queryFn: async () => { const { data } = await supabase.from("partners").select("partner_id, partner_name").order("partner_name"); return data || []; },
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ["need", id],
    queryFn: async () => { const { data, error } = await supabase.from("partner_needs").select("*").eq("need_id", id!).single(); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    title: "", partner_id: "", description: "", need_type: "", need_status: "hypothesis",
    priority_level: "", business_context: "", expected_result: "", time_horizon: "",
    maturity_level: "", budget_signal: "", data_access_signal: "",
    recommended_collaboration_format: "", notes: "",
  });

  useEffect(() => { if (item) setForm(Object.fromEntries(Object.keys(form).map(k => [k, (item as any)[k] || ""])) as any); }, [item]);

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, partner_id: form.partner_id || undefined };
      if (!payload.partner_id) { toast.error("Выберите партнера"); throw new Error("no partner"); }
      if (isNew) { const { error } = await supabase.from("partner_needs").insert(payload as any); if (error) throw error; }
      else { const { error } = await supabase.from("partner_needs").update(payload as any).eq("need_id", id!); if (error) throw error; }
    },
    onSuccess: () => { toast.success(isNew ? "Создано" : "Сохранено"); qc.invalidateQueries({ queryKey: ["needs"] }); navigate("/needs"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("partner_needs").delete().eq("need_id", id!); if (error) throw error; },
    onSuccess: () => { toast.success("Удалено"); navigate("/needs"); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/needs"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новая потребность" : form.title}</h1>
        {!isNew && isAdmin && <Button variant="destructive" size="sm" onClick={() => { if (confirm("Удалить?")) del.mutate(); }}><Trash2 className="mr-1 h-4 w-4" />Удалить</Button>}
      </div>
      <Card>
        <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Название *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2">
            <Label>Партнер *</Label>
            <Select value={form.partner_id} onValueChange={v => set("partner_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{partners?.map(p => <SelectItem key={p.partner_id} value={p.partner_id}>{p.partner_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Тип потребности</Label>
            <Select value={form.need_type} onValueChange={v => set("need_type", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="research">Исследование</SelectItem><SelectItem value="development">Разработка</SelectItem>
                <SelectItem value="consulting">Консалтинг</SelectItem><SelectItem value="education">Обучение</SelectItem>
                <SelectItem value="other">Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={form.need_status} onValueChange={v => set("need_status", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="hypothesis">Гипотеза</SelectItem><SelectItem value="confirmed">Подтверждена</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem><SelectItem value="resolved">Решена</SelectItem><SelectItem value="rejected">Отклонена</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Приоритет</Label>
            <Select value={form.priority_level} onValueChange={v => set("priority_level", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Низкий</SelectItem><SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="high">Высокий</SelectItem><SelectItem value="critical">Критический</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Временной горизонт</Label><Input value={form.time_horizon} onChange={e => set("time_horizon", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Уровень зрелости</Label><Input value={form.maturity_level} onChange={e => set("maturity_level", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Сигнал бюджета</Label><Input value={form.budget_signal} onChange={e => set("budget_signal", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Описание</Label><Textarea value={form.description} onChange={e => set("description", e.target.value)} disabled={!canEdit} rows={3} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Бизнес-контекст</Label><Textarea value={form.business_context} onChange={e => set("business_context", e.target.value)} disabled={!canEdit} rows={3} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Ожидаемый результат</Label><Textarea value={form.expected_result} onChange={e => set("expected_result", e.target.value)} disabled={!canEdit} rows={2} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Заметки</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} /></div>
        </CardContent>
      </Card>
      {canEdit && <Button onClick={() => save.mutate()} disabled={!form.title || !form.partner_id || save.isPending}><Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}</Button>}
    </div>
  );
}
