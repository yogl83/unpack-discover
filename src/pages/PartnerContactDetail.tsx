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

const contactKindLabels: Record<string, string> = {
  official: "Официальный",
  warm: "Тёплый",
  operational: "Оперативный",
  decision_maker: "ЛПР",
  technical: "Технический",
  other: "Другой",
};

const roleLabels: Record<string, string> = {
  decision_maker: "ЛПР",
  technical_contact: "Технический контакт",
  champion: "Чемпион",
  blocker: "Блокер",
  influencer: "Влиятельное лицо",
  end_user: "Конечный пользователь",
};

export default function PartnerContactDetail() {
  const { partnerId, contactId } = useParams();
  const isNew = contactId === "new" || !contactId;
  const standalone = !partnerId;
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("");

  const { data: partner } = useQuery({
    queryKey: ["partner", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("partner_name").eq("partner_id", partnerId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!partnerId,
  });

  const { data: allPartners } = useQuery({
    queryKey: ["partners-list-for-select"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("partner_id, partner_name").order("partner_name");
      if (error) throw error;
      return data;
    },
    enabled: standalone,
  });

  const { data: item, isLoading } = useQuery({
    queryKey: ["contact", contactId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").eq("contact_id", contactId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    full_name: "",
    job_title: "",
    department_name: "",
    email: "",
    phone: "",
    telegram: "",
    contact_role: "",
    contact_kind: "official",
    influence_level: "",
    relationship_status: "",
    is_primary: false,
    notes: "",
  });

  useEffect(() => {
    if (item) {
      setForm({
        full_name: item.full_name || "",
        job_title: item.job_title || "",
        department_name: item.department_name || "",
        email: item.email || "",
        phone: item.phone || "",
        telegram: (item as any).telegram || "",
        contact_role: item.contact_role || "",
        contact_kind: (item as any).contact_kind || "official",
        influence_level: item.influence_level || "",
        relationship_status: item.relationship_status || "",
        is_primary: item.is_primary || false,
        notes: item.notes || "",
      });
      if (standalone && item.partner_id) {
        setSelectedPartnerId(item.partner_id);
      }
    }
  }, [item, standalone]);

  const effectivePartnerId = standalone ? (selectedPartnerId || null) : partnerId!;

  const save = useMutation({
    mutationFn: async () => {
      if (!form.full_name.trim()) { toast.error("Укажите ФИО"); throw new Error("required"); }
      const payload = { ...form, partner_id: effectivePartnerId } as any;
      if (isNew) {
        const { error } = await supabase.from("contacts").insert(payload);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contacts").update(payload).eq("contact_id", contactId!);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(isNew ? "Контакт создан" : "Сохранено");
      if (standalone) {
        qc.invalidateQueries({ queryKey: ["all-external-contacts"] });
        navigate("/contacts/external");
      } else {
        qc.invalidateQueries({ queryKey: ["partner-contacts", partnerId] });
        navigate(`/partners/${partnerId}`);
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("contacts").delete().eq("contact_id", contactId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Контакт удалён");
      if (standalone) {
        qc.invalidateQueries({ queryKey: ["all-external-contacts"] });
        navigate("/contacts/external");
      } else {
        qc.invalidateQueries({ queryKey: ["partner-contacts", partnerId] });
        navigate(`/partners/${partnerId}`);
      }
    },
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const backLink = standalone ? "/contacts/external" : `/partners/${partnerId}`;

  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={backLink}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">
            {standalone ? "Контакты" : `${partner?.partner_name || "Организация"} → Контакты`}
          </p>
          <h1 className="text-2xl font-bold">{isNew ? "Новый контакт" : form.full_name}</h1>
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
              <Label>Партнёр</Label>
              <Select value={selectedPartnerId} onValueChange={setSelectedPartnerId} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Без привязки (можно выбрать позже)" /></SelectTrigger>
                <SelectContent>
                  {allPartners?.map(p => (
                    <SelectItem key={p.partner_id} value={p.partner_id}>{p.partner_name}</SelectItem>
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
            <Label>Подразделение</Label>
            <Input value={form.department_name} onChange={e => set("department_name", e.target.value)} disabled={!canEdit} />
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
          <div className="space-y-2">
            <Label>Тип контакта</Label>
            <Select value={form.contact_kind} onValueChange={v => set("contact_kind", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(contactKindLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
            <Label>Уровень влияния</Label>
            <Select value={form.influence_level} onValueChange={v => set("influence_level", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Низкий</SelectItem>
                <SelectItem value="medium">Средний</SelectItem>
                <SelectItem value="high">Высокий</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Статус отношений</Label>
            <Select value={form.relationship_status} onValueChange={v => set("relationship_status", v)} disabled={!canEdit}>
              <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Активный</SelectItem>
                <SelectItem value="inactive">Неактивный</SelectItem>
                <SelectItem value="new">Новый</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={form.is_primary} onCheckedChange={v => set("is_primary", v)} disabled={!canEdit} />
            <Label>Основной контакт</Label>
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
