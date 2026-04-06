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

export default function SourceDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: partners } = useQuery({ queryKey: ["partners-select"], queryFn: async () => { const { data } = await supabase.from("partners").select("partner_id, partner_name").order("partner_name"); return data || []; } });

  const { data: item, isLoading } = useQuery({
    queryKey: ["source", id],
    queryFn: async () => { const { data, error } = await supabase.from("sources").select("*").eq("source_id", id!).single(); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    title: "", partner_id: "", source_type: "", source_url: "", publisher: "",
    publication_date: "", source_reliability: "", summary: "", checked_at: "", notes: "",
  });

  useEffect(() => { if (item) setForm(Object.fromEntries(Object.keys(form).map(k => [k, (item as any)[k] || ""])) as any); }, [item]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.title) { toast.error("Укажите название"); throw new Error("required"); }
      const payload = { ...form, partner_id: form.partner_id || null, publication_date: form.publication_date || null, checked_at: form.checked_at || null };
      if (isNew) { const { error } = await supabase.from("sources").insert(payload as any); if (error) throw error; }
      else { const { error } = await supabase.from("sources").update(payload as any).eq("source_id", id!); if (error) throw error; }
    },
    onSuccess: () => { toast.success(isNew ? "Создано" : "Сохранено"); qc.invalidateQueries({ queryKey: ["sources"] }); navigate("/sources"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("sources").delete().eq("source_id", id!); if (error) throw error; },
    onSuccess: () => { toast.success("Удалено"); navigate("/sources"); },
  });

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/sources"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новый источник" : form.title}</h1>
        {!isNew && isAdmin && <Button variant="destructive" size="sm" onClick={() => { if (confirm("Удалить?")) del.mutate(); }}><Trash2 className="mr-1 h-4 w-4" />Удалить</Button>}
      </div>
      <Card>
        <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Название *</Label><Input value={form.title} onChange={e => set("title", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2">
            <Label>Партнер</Label>
            <Select value={form.partner_id} onValueChange={v => set("partner_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{partners?.map(p => <SelectItem key={p.partner_id} value={p.partner_id}>{p.partner_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Тип источника</Label>
            <Select value={form.source_type} onValueChange={v => set("source_type", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="website">Сайт</SelectItem><SelectItem value="report">Отчёт</SelectItem>
                <SelectItem value="interview">Интервью</SelectItem><SelectItem value="news">Новость</SelectItem>
                <SelectItem value="other">Другое</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>URL</Label><Input value={form.source_url} onChange={e => set("source_url", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Издатель</Label><Input value={form.publisher} onChange={e => set("publisher", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Дата публикации</Label><Input type="date" value={form.publication_date} onChange={e => set("publication_date", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Надёжность</Label><Input value={form.source_reliability} onChange={e => set("source_reliability", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Дата проверки</Label><Input type="date" value={form.checked_at} onChange={e => set("checked_at", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Краткое содержание</Label><Textarea value={form.summary} onChange={e => set("summary", e.target.value)} disabled={!canEdit} rows={3} /></div>
          <div className="space-y-2 sm:col-span-2"><Label>Заметки</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} /></div>
        </CardContent>
      </Card>
      {canEdit && <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}</Button>}
    </div>
  );
}
