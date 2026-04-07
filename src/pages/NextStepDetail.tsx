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

export default function NextStepDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: partners } = useQuery({ queryKey: ["partners-select"], queryFn: async () => { const { data } = await supabase.from("partners").select("partner_id, partner_name").order("partner_name"); return data || []; } });
  const { data: hypotheses } = useQuery({ queryKey: ["hypotheses-select"], queryFn: async () => { const { data } = await supabase.from("collaboration_hypotheses").select("hypothesis_id, title, partner_id").order("title"); return data || []; } });
  const { data: needs } = useQuery({ queryKey: ["needs-select"], queryFn: async () => { const { data } = await supabase.from("partner_needs").select("need_id, title, partner_id").order("title"); return data || []; } });

  const { data: item, isLoading } = useQuery({
    queryKey: ["next-step", id],
    queryFn: async () => { const { data, error } = await supabase.from("next_steps").select("*").eq("next_step_id", id!).single(); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    action_title: "", action_description: "", entity_type: "partner", entity_id: "",
    partner_id: "", need_id: "", hypothesis_id: "",
    next_step_status: "new", due_date: "", result: "", notes: "",
  });

  useEffect(() => { if (item) setForm(Object.fromEntries(Object.keys(form).map(k => [k, String((item as any)[k] ?? "")])) as any); }, [item]);

  // Filter hypotheses/needs by selected partner
  const filteredHypotheses = form.partner_id
    ? hypotheses?.filter(h => h.partner_id === form.partner_id) || []
    : hypotheses || [];
  const filteredNeeds = form.partner_id
    ? needs?.filter(n => n.partner_id === form.partner_id) || []
    : needs || [];

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        partner_id: form.partner_id || null,
        need_id: form.need_id || null,
        hypothesis_id: form.hypothesis_id || null,
        entity_id: form.partner_id || form.entity_id || "00000000-0000-0000-0000-000000000000",
        due_date: form.due_date || null,
      };
      if (!payload.action_title) { toast.error("Укажите действие"); throw new Error("required"); }
      if (isNew) { const { error } = await supabase.from("next_steps").insert(payload as any); if (error) throw error; }
      else { const { error } = await supabase.from("next_steps").update(payload as any).eq("next_step_id", id!); if (error) throw error; }
    },
    onSuccess: () => { toast.success(isNew ? "Создано" : "Сохранено"); qc.invalidateQueries({ queryKey: ["next-steps"] }); navigate("/next-steps"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("next_steps").delete().eq("next_step_id", id!); if (error) throw error; },
    onSuccess: () => { toast.success("Удалено"); navigate("/next-steps"); },
  });

  const set = (k: string, v: string) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      if (k === "partner_id" && v !== p.partner_id) {
        next.need_id = "";
        next.hypothesis_id = "";
      }
      return next;
    });
  };

  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/next-steps"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новый шаг" : form.action_title}</h1>
        {!isNew && isAdmin && <Button variant="destructive" size="sm" onClick={() => { if (confirm("Удалить?")) del.mutate(); }}><Trash2 className="mr-1 h-4 w-4" />Удалить</Button>}
      </div>
      <Card>
        <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Действие *</Label><Input value={form.action_title} onChange={e => set("action_title", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2">
            <Label>Партнер</Label>
            <Select value={form.partner_id} onValueChange={v => set("partner_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{partners?.map(p => <SelectItem key={p.partner_id} value={p.partner_id}>{p.partner_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Потребность</Label>
            <Select value={form.need_id} onValueChange={v => set("need_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{filteredNeeds.map(n => <SelectItem key={n.need_id} value={n.need_id}>{n.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Гипотеза</Label>
            <Select value={form.hypothesis_id} onValueChange={v => set("hypothesis_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{filteredHypotheses.map(h => <SelectItem key={h.hypothesis_id} value={h.hypothesis_id}>{h.title || "Без названия"}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={form.next_step_status} onValueChange={v => set("next_step_status", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Новый</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="done">Выполнен</SelectItem>
                <SelectItem value="cancelled">Отменён</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Тип сущности</Label>
            <Select value={form.entity_type} onValueChange={v => set("entity_type", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">Партнер</SelectItem>
                <SelectItem value="need">Потребность</SelectItem>
                <SelectItem value="hypothesis">Гипотеза</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Срок</Label><Input type="date" value={form.due_date} onChange={e => set("due_date", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Описание</Label><Textarea value={form.action_description} onChange={e => set("action_description", e.target.value)} disabled={!canEdit} rows={3} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Результат</Label><Textarea value={form.result} onChange={e => set("result", e.target.value)} disabled={!canEdit} rows={2} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Заметки</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} /></div>
        </CardContent>
      </Card>
      {canEdit && <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}</Button>}
    </div>
  );
}
