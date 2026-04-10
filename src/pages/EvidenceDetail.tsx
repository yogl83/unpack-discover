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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export default function EvidenceDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: partners } = useQuery({ queryKey: ["partners-select"], queryFn: async () => { const { data } = await supabase.from("partners").select("partner_id, partner_name").order("partner_name"); return data || []; } });
  const { data: sources } = useQuery({ queryKey: ["sources-select"], queryFn: async () => { const { data } = await supabase.from("sources").select("source_id, title").order("title"); return data || []; } });

  const { data: item, isLoading } = useQuery({
    queryKey: ["evidence-item", id],
    queryFn: async () => { const { data, error } = await supabase.from("evidence").select("*").eq("evidence_id", id!).single(); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    entity_type: "partner", entity_id: "", partner_id: "", source_id: "",
    field_name: "", field_value: "", data_collection_method: "",
    confidence_level: "", requires_interview_validation: false, analyst_comment: "",
  });

  useEffect(() => {
    if (item) setForm({
      entity_type: item.entity_type || "partner",
      entity_id: item.entity_id || "",
      partner_id: item.partner_id || "",
      source_id: item.source_id || "",
      field_name: item.field_name || "",
      field_value: item.field_value || "",
      data_collection_method: item.data_collection_method || "",
      confidence_level: item.confidence_level || "",
      requires_interview_validation: item.requires_interview_validation || false,
      analyst_comment: item.analyst_comment || "",
    });
  }, [item]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.entity_type || !form.entity_id) { toast.error("Заполните обязательные поля"); throw new Error("required"); }
      const payload = { ...form, partner_id: form.partner_id || null, source_id: form.source_id || null };
      if (isNew) { const { error } = await supabase.from("evidence").insert(payload as any); if (error) throw error; }
      else { const { error } = await supabase.from("evidence").update(payload as any).eq("evidence_id", id!); if (error) throw error; }
    },
    onSuccess: () => { toast.success(isNew ? "Создано" : "Сохранено"); qc.invalidateQueries({ queryKey: ["evidence"] }); navigate("/evidence"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("evidence").delete().eq("evidence_id", id!); if (error) throw error; },
    onSuccess: () => { toast.success("Удалено"); navigate("/evidence"); },
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/evidence"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новое подтверждение" : `${form.entity_type}: ${form.field_name}`}</h1>
        {!isNew && isAdmin && <ConfirmDialog title="Удалить подтверждение?" description="Подтверждение будет удалено безвозвратно." onConfirm={() => del.mutate()} />}
      </div>
      <Card>
        <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Тип сущности *</Label>
            <Select value={form.entity_type} onValueChange={v => set("entity_type", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">Партнер</SelectItem><SelectItem value="need">Потребность</SelectItem>
                <SelectItem value="hypothesis">Гипотеза</SelectItem><SelectItem value="unit">Коллектив</SelectItem>
                <SelectItem value="competency">Компетенция</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>ID сущности *</Label><Input value={form.entity_id} onChange={e => set("entity_id", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2">
            <Label>Партнер</Label>
            <Select value={form.partner_id} onValueChange={v => set("partner_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{partners?.map(p => <SelectItem key={p.partner_id} value={p.partner_id}>{p.partner_name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Источник</Label>
            <Select value={form.source_id} onValueChange={v => set("source_id", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>{sources?.map(s => <SelectItem key={s.source_id} value={s.source_id}>{s.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-2"><Label>Название поля</Label><Input value={form.field_name} onChange={e => set("field_name", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Значение поля</Label><Input value={form.field_value} onChange={e => set("field_value", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Метод сбора</Label><Input value={form.data_collection_method} onChange={e => set("data_collection_method", e.target.value)} disabled={!canEdit} /></div>
          <div className="space-y-2"><Label>Уровень уверенности</Label><Input value={form.confidence_level} onChange={e => set("confidence_level", e.target.value)} disabled={!canEdit} /></div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <Checkbox checked={form.requires_interview_validation} onCheckedChange={v => set("requires_interview_validation", v)} disabled={!canEdit} />
            <Label>Требует валидации интервью</Label>
          </div>
          <div className="space-y-2 sm:col-span-2"><Label>Комментарий аналитика</Label><Textarea value={form.analyst_comment} onChange={e => set("analyst_comment", e.target.value)} disabled={!canEdit} rows={3} /></div>
        </CardContent>
      </Card>
      {canEdit && <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}</Button>}
    </div>
  );
}
