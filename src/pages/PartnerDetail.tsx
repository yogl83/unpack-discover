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

export default function PartnerDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: partner, isLoading } = useQuery({
    queryKey: ["partner", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*").eq("partner_id", id!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    partner_name: "", legal_name: "", website_url: "", industry: "", subindustry: "",
    business_model: "", city: "", geography: "", company_size: "", company_profile: "",
    technology_profile: "", strategic_priorities: "", priority_level: "", partner_status: "new", notes: "",
  });

  useEffect(() => {
    if (partner) {
      setForm(Object.fromEntries(Object.keys(form).map(k => [k, (partner as any)[k] || ""])) as any);
    }
  }, [partner]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.partner_name.trim()) { toast.error("Введите название партнера"); throw new Error("required"); }
      if (isNew) {
        const { error } = await supabase.from("partners").insert(form);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("partners").update(form).eq("partner_id", id!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isNew ? "Партнер создан" : "Изменения сохранены");
      qc.invalidateQueries({ queryKey: ["partners"] });
      navigate("/partners");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("partners").delete().eq("partner_id", id!);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Партнер удален"); qc.invalidateQueries({ queryKey: ["partners"] }); navigate("/partners"); },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (key: string, val: string) => setForm(prev => ({ ...prev, [key]: val }));

  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/partners"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новый партнер" : form.partner_name}</h1>
        {!isNew && isAdmin && (
          <Button variant="destructive" size="sm" onClick={() => { if (confirm("Удалить партнера и все связанные данные?")) del.mutate(); }}>
            <Trash2 className="mr-1 h-4 w-4" />Удалить
          </Button>
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Название партнера *</Label>
            <Input value={form.partner_name} onChange={e => set("partner_name", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Юридическое наименование</Label>
            <Input value={form.legal_name} onChange={e => set("legal_name", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Сайт</Label>
            <Input value={form.website_url} onChange={e => set("website_url", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Отрасль</Label>
            <Input value={form.industry} onChange={e => set("industry", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Подотрасль</Label>
            <Input value={form.subindustry} onChange={e => set("subindustry", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Бизнес-модель</Label>
            <Select value={form.business_model} onValueChange={v => set("business_model", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="B2B">B2B</SelectItem>
                <SelectItem value="B2G">B2G</SelectItem>
                <SelectItem value="B2C">B2C</SelectItem>
                <SelectItem value="mixed">Смешанная</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Город</Label>
            <Input value={form.city} onChange={e => set("city", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>География</Label>
            <Input value={form.geography} onChange={e => set("geography", e.target.value)} disabled={!canEdit} placeholder="Россия, СНГ, международный..." />
          </div>
          <div className="space-y-2">
            <Label>Размер компании</Label>
            <Select value={form.company_size} onValueChange={v => set("company_size", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="startup">Стартап (&lt;50)</SelectItem>
                <SelectItem value="small">Малый (50–250)</SelectItem>
                <SelectItem value="medium">Средний (250–1000)</SelectItem>
                <SelectItem value="large">Крупный (1000–5000)</SelectItem>
                <SelectItem value="enterprise">Корпорация (5000+)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Статус</Label>
            <Select value={form.partner_status} onValueChange={v => set("partner_status", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="new">Новый</SelectItem>
                <SelectItem value="in_review">На рассмотрении</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="active">Активный</SelectItem>
                <SelectItem value="on_hold">На паузе</SelectItem>
                <SelectItem value="archived">Архив</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Приоритет</Label>
            <Select value={form.priority_level} onValueChange={v => set("priority_level", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Низкий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
                <SelectItem value="critical">Критический</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Профиль компании</Label>
            <Textarea value={form.company_profile} onChange={e => set("company_profile", e.target.value)} disabled={!canEdit} rows={3} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Технологический профиль</Label>
            <Textarea value={form.technology_profile} onChange={e => set("technology_profile", e.target.value)} disabled={!canEdit} rows={2} placeholder="Используемые технологии, стек, платформы..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Стратегические приоритеты</Label>
            <Textarea value={form.strategic_priorities} onChange={e => set("strategic_priorities", e.target.value)} disabled={!canEdit} rows={2} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Заметки</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={3} />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <Button onClick={() => save.mutate()} disabled={!form.partner_name.trim() || save.isPending}>
          <Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}
        </Button>
      )}
    </div>
  );
}
