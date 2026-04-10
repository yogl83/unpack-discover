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
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const roleLabels: Record<string, string> = {
  lead: "Руководитель",
  researcher: "Исследователь",
  engineer: "Инженер",
  manager: "Менеджер",
  coordinator: "Координатор",
  other: "Другой",
};

export default function UnitContactDetail() {
  const { unitId, contactId } = useParams();
  const isNew = contactId === "new" || !contactId;
  const standalone = !unitId;
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  const { data: unit } = useQuery({
    queryKey: ["unit", unitId],
    queryFn: async () => {
      const { data, error } = await supabase.from("miem_units").select("unit_name").eq("unit_id", unitId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!unitId,
  });

  const { data: allUnits } = useQuery({
    queryKey: ["units-list-for-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("miem_units").select("unit_id, unit_name").order("unit_name");
      if (error) throw error;
      return data;
    },
    enabled: standalone,
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ["unit-contact", contactId],
    queryFn: async () => {
      const { data, error } = await supabase.from("unit_contacts").select("*").eq("unit_contact_id", contactId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    full_name: "",
    job_title: "",
    email: "",
    phone: "",
    telegram: "",
    contact_role: "",
    is_primary: false,
    availability_notes: "",
    notes: "",
  });

  useEffect(() => {
    if (item) {
      setForm({
        full_name: item.full_name || "",
        job_title: item.job_title || "",
        email: item.email || "",
        phone: item.phone || "",
        telegram: item.telegram || "",
        contact_role: item.contact_role || "",
        is_primary: item.is_primary || false,
        availability_notes: item.availability_notes || "",
        notes: item.notes || "",
      });
      if (standalone && item.unit_id) {
        setSelectedUnitId(item.unit_id);
      }
    }
  }, [item, standalone]);

  const effectiveUnitId = standalone ? (selectedUnitId || null) : unitId!;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) { toast.error("Укажите ФИО"); throw new Error("required"); }
      const payload = { ...form, unit_id: effectiveUnitId } as any;
      if (isNew) {
        const { error } = await supabase.from("unit_contacts").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("unit_contacts").update(payload).eq("unit_contact_id", contactId!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isNew ? "Контакт создан" : "Сохранено");
      if (standalone) {
        qc.invalidateQueries({ queryKey: ["all-internal-contacts"] });
        navigate("/contacts/internal");
      } else {
        qc.invalidateQueries({ queryKey: ["unit-contacts", unitId] });
        navigate(`/units/${unitId}`);
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("unit_contacts").delete().eq("unit_contact_id", contactId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Контакт удалён");
      if (standalone) {
        qc.invalidateQueries({ queryKey: ["all-internal-contacts"] });
        navigate("/contacts/internal");
      } else {
        qc.invalidateQueries({ queryKey: ["unit-contacts", unitId] });
        navigate(`/units/${unitId}`);
      }
    },
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const backLink = standalone ? "/contacts/internal" : `/units/${unitId}`;

  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={backLink}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">
            {standalone ? "Внутренние контакты" : `${unit?.unit_name || "Коллектив"} → Контакты`}
          </p>
          <h1 className="text-2xl font-bold">{isNew ? "Новый контакт МИЭМ" : form.full_name}</h1>
        </div>
        {!isNew && isAdmin && (
          <ConfirmDialog title="Удалить контакт?" description="Контакт будет удалён безвозвратно." onConfirm={() => del.mutate()} />
        )}
      </div>

      <Card>
        <CardHeader><CardTitle>Контактная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {standalone && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Коллектив</Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Без привязки (можно выбрать позже)" /></SelectTrigger>
                <SelectContent>
                  {allUnits?.map(u => (
                    <SelectItem key={u.unit_id} value={u.unit_id}>{u.unit_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label>ФИО *</Label>
            <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Должность</Label>
            <Input value={form.job_title} onChange={e => set("job_title", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Роль</Label>
            <Select value={form.contact_role} onValueChange={v => set("contact_role", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                {Object.entries(roleLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Телефон</Label>
            <Input value={form.phone} onChange={e => set("phone", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Telegram</Label>
            <Input value={form.telegram} onChange={e => set("telegram", e.target.value)} disabled={!canEdit} placeholder="@username" />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={form.is_primary} onCheckedChange={v => set("is_primary", v)} disabled={!canEdit} />
            <Label>Основной контакт</Label>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Доступность</Label>
            <Textarea value={form.availability_notes} onChange={e => set("availability_notes", e.target.value)} disabled={!canEdit} rows={2} placeholder="Когда доступен, предпочтительный способ связи..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Заметки</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={3} />
          </div>
        </CardContent>
      </Card>

      {canEdit && (
        <Button onClick={() => save.mutate()} disabled={save.isPending}>
          <Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}
        </Button>
      )}
    </div>
  );
}
