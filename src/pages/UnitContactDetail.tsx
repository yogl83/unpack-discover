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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Save, Plus, Pencil, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { MarkdownWysiwyg } from "@/components/partner/MarkdownWysiwyg";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { portfolioTypeLabels } from "@/lib/labels";

const roleLabels: Record<string, string> = {
  lead: "Руководитель",
  researcher: "Исследователь",
  engineer: "Инженер",
  manager: "Менеджер",
  coordinator: "Координатор",
  other: "Другой",
};

const portfolioTitlePlaceholders: Record<string, string> = {
  project: "Наименование проекта",
  publication: "Название публикации",
  patent: "Название патента",
  grant: "Название гранта",
  product: "Название продукта",
  other: "Название",
};

const portfolioDialogTitles: Record<string, { new: string; edit: string }> = {
  project: { new: "Новый проект", edit: "Редактировать проект" },
  publication: { new: "Новая публикация", edit: "Редактировать публикацию" },
  patent: { new: "Новый патент", edit: "Редактировать патент" },
  grant: { new: "Новый грант", edit: "Редактировать грант" },
  product: { new: "Новый продукт", edit: "Редактировать продукт" },
  other: { new: "Новый элемент", edit: "Редактировать элемент" },
};

const emptyPortfolioForm = {
  title: "", item_type: "project", organization_name: "", description: "",
  year_from: "", year_to: "", url: "", notes: "",
};

export default function UnitContactDetail() {
  const { unitId, contactId } = useParams();
  const isNew = contactId === "new" || !contactId;
  const standalone = !unitId;
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const [selectedUnitId, setSelectedUnitId] = useState<string>("");

  // Portfolio state
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
  const [portfolioTypePreset, setPortfolioTypePreset] = useState(false);
  const [pForm, setPForm] = useState(emptyPortfolioForm);

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

  const { data: portfolioItems } = useQuery({
    queryKey: ["contact-portfolio", contactId],
    queryFn: async () => {
      const { data, error } = await supabase.from("contact_portfolio_items").select("*").eq("unit_contact_id", contactId!).order("year_from", { ascending: false });
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
    orcid: "",
    scopus_id: "",
    scholar_url: "",
    personal_summary: "",
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
        orcid: (item as any).orcid || "",
        scopus_id: (item as any).scopus_id || "",
        scholar_url: (item as any).scholar_url || "",
        personal_summary: (item as any).personal_summary || "",
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

  // Portfolio mutations
  const savePortfolio = useMutation({
    mutationFn: async () => {
      if (!pForm.title.trim()) { toast.error("Укажите название"); throw new Error("required"); }
      const payload = {
        unit_contact_id: contactId!,
        title: pForm.title,
        item_type: pForm.item_type,
        organization_name: pForm.organization_name || null,
        description: pForm.description || null,
        url: pForm.url || null,
        notes: pForm.notes || null,
        year_from: pForm.year_from ? Number(pForm.year_from) : null,
        year_to: pForm.year_to ? Number(pForm.year_to) : null,
      };
      if (editingPortfolioId) {
        const { error } = await supabase.from("contact_portfolio_items").update(payload).eq("portfolio_item_id", editingPortfolioId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("contact_portfolio_items").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editingPortfolioId ? "Сохранено" : "Добавлено");
      setPortfolioDialogOpen(false);
      qc.invalidateQueries({ queryKey: ["contact-portfolio", contactId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePortfolio = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("contact_portfolio_items").delete().eq("portfolio_item_id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Удалено");
      qc.invalidateQueries({ queryKey: ["contact-portfolio", contactId] });
    },
  });

  const saveSummary = useMutation({
    mutationFn: async (value: string) => {
      const { error } = await supabase.from("unit_contacts").update({ personal_summary: value } as any).eq("unit_contact_id", contactId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Сохранено");
      qc.invalidateQueries({ queryKey: ["unit-contact", contactId] });
    },
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));
  const setP = (k: string, v: any) => setPForm(p => ({ ...p, [k]: v }));
  const backLink = standalone ? "/contacts/internal" : `/units/${unitId}`;

  const openAddPortfolio = (type?: string) => {
    setEditingPortfolioId(null);
    setPForm({ ...emptyPortfolioForm, item_type: type || "project" });
    setPortfolioTypePreset(!!type);
    setPortfolioDialogOpen(true);
  };

  const openEditPortfolio = (p: any) => {
    setEditingPortfolioId(p.portfolio_item_id);
    setPForm({
      title: p.title || "", item_type: p.item_type || "other",
      organization_name: p.organization_name || "", description: p.description || "",
      year_from: p.year_from?.toString() || "", year_to: p.year_to?.toString() || "",
      url: p.url || "", notes: p.notes || "",
    });
    setPortfolioTypePreset(true);
    setPortfolioDialogOpen(true);
  };

  const portfolioByType = (portfolioItems || []).reduce<Record<string, any[]>>((acc, p) => {
    const t = p.item_type || "other";
    if (!acc[t]) acc[t] = [];
    acc[t].push(p);
    return acc;
  }, {});

  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link to={backLink}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <p className="text-sm text-muted-foreground">
            {standalone ? "Контакты МИЭМ" : `${unit?.unit_name || "Коллектив"} → Контакты`}
          </p>
          <h1 className="text-2xl font-bold">{isNew ? "Новый контакт МИЭМ" : form.full_name}</h1>
        </div>
        {!isNew && isAdmin && (
          <ConfirmDialog title="Удалить контакт?" description="Контакт будет удалён безвозвратно." onConfirm={() => del.mutate()} />
        )}
      </div>

      {isNew ? (
        <ContactInfoForm
          form={form} set={set} canEdit={canEdit} standalone={standalone}
          selectedUnitId={selectedUnitId} setSelectedUnitId={setSelectedUnitId}
          allUnits={allUnits} isNew={isNew} save={save}
        />
      ) : (
        <Tabs defaultValue="info">
          <TabsList>
            <TabsTrigger value="info">Информация</TabsTrigger>
            <TabsTrigger value="portfolio">Портфолио</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <ContactInfoForm
              form={form} set={set} canEdit={canEdit} standalone={standalone}
              selectedUnitId={selectedUnitId} setSelectedUnitId={setSelectedUnitId}
              allUnits={allUnits} isNew={isNew} save={save}
            />
          </TabsContent>

          <TabsContent value="portfolio" className="space-y-4">
            {/* Personal summary */}
            <Card>
              <CardHeader><CardTitle>Достижения и результаты</CardTitle></CardHeader>
              <CardContent>
                {canEdit ? (
                  <div className="space-y-2">
                    <MarkdownWysiwyg
                      value={form.personal_summary}
                      onChange={v => set("personal_summary", v)}
                    />
                    <Button size="sm" variant="outline" onClick={() => saveSummary.mutate(form.personal_summary)} disabled={saveSummary.isPending}>
                      <Save className="mr-1 h-3.5 w-3.5" />Сохранить описание
                    </Button>
                  </div>
                ) : (
                  form.personal_summary ? (
                    <div className="prose prose-sm max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.personal_summary}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">Описание не заполнено</p>
                  )
                )}
              </CardContent>
            </Card>

            {/* Portfolio by type */}
            <Card>
              <CardContent className="pt-6">
                <Accordion type="multiple" defaultValue={Object.keys(portfolioTypeLabels)}>
                  {Object.entries(portfolioTypeLabels).map(([type, label]) => {
                    const items = portfolioByType[type] || [];
                    return (
                      <AccordionItem key={type} value={type}>
                        <AccordionTrigger className="text-base font-semibold">
                          {label} ({items.length})
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2">
                            {canEdit && (
                              <Button size="sm" variant="outline" onClick={() => openAddPortfolio(type)}>
                                <Plus className="mr-1 h-3.5 w-3.5" />Добавить
                              </Button>
                            )}
                            {items.length === 0 ? (
                              <p className="text-muted-foreground text-sm py-2">Нет записей</p>
                            ) : (
                              <div className="space-y-2">
                                {items.map(p => (
                                  <div key={p.portfolio_item_id} className="flex items-start justify-between border rounded-md p-3">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">
                                          {p.url ? (
                                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                              {p.title}<ExternalLink className="h-3 w-3" />
                                            </a>
                                          ) : p.title}
                                        </span>
                                        {p.year_from && (
                                          <span className="text-muted-foreground text-xs">
                                            {p.year_from}{p.year_to ? `–${p.year_to}` : "–н.в."}
                                          </span>
                                        )}
                                      </div>
                                      {p.organization_name && <p className="text-sm text-muted-foreground">{p.organization_name}</p>}
                                      {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                                    </div>
                                    {canEdit && (
                                      <div className="flex gap-1 shrink-0">
                                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditPortfolio(p)}>
                                          <Pencil className="h-3.5 w-3.5" />
                                        </Button>
                                        {isAdmin && (
                                          <ConfirmDialog title="Удалить элемент?" description="Элемент портфолио будет удалён." onConfirm={() => deletePortfolio.mutate(p.portfolio_item_id)} triggerLabel="" triggerSize="sm" triggerClassName="text-destructive h-7 w-7" variant="default" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>

            {/* Portfolio item dialog */}
            <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{editingPortfolioId ? (portfolioDialogTitles[pForm.item_type]?.edit || "Редактировать элемент") : (portfolioDialogTitles[pForm.item_type]?.new || "Новый элемент")}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-2">
                  <div className="space-y-2"><Label>Название *</Label><Input value={pForm.title} onChange={e => setP("title", e.target.value)} placeholder={portfolioTitlePlaceholders[pForm.item_type] || "Название"} /></div>
                  <div className={`grid gap-4 ${portfolioTypePreset ? "grid-cols-1" : "grid-cols-2"}`}>
                    {!portfolioTypePreset && (
                      <div className="space-y-2">
                        <Label>Тип</Label>
                        <Select value={pForm.item_type} onValueChange={v => setP("item_type", v)}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(portfolioTypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div className="space-y-2"><Label>Организация</Label><Input value={pForm.organization_name} onChange={e => setP("organization_name", e.target.value)} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Год начала</Label><Input type="number" value={pForm.year_from} onChange={e => setP("year_from", e.target.value)} placeholder="2020" /></div>
                    <div className="space-y-2"><Label>Год окончания</Label><Input type="number" value={pForm.year_to} onChange={e => setP("year_to", e.target.value)} placeholder="2024" /></div>
                  </div>
                  <div className="space-y-2"><Label>Ссылка</Label><Input value={pForm.url} onChange={e => setP("url", e.target.value)} placeholder="https://..." /></div>
                  <div className="space-y-2"><Label>Описание</Label><Textarea value={pForm.description} onChange={e => setP("description", e.target.value)} rows={3} /></div>
                  <div className="space-y-2"><Label>Заметки</Label><Textarea value={pForm.notes} onChange={e => setP("notes", e.target.value)} rows={2} /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPortfolioDialogOpen(false)}>Отмена</Button>
                  <Button onClick={() => savePortfolio.mutate()} disabled={savePortfolio.isPending}>
                    <Save className="mr-2 h-4 w-4" />{editingPortfolioId ? "Сохранить" : "Добавить"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ── Info form extracted as a sub-component ── */
function ContactInfoForm({ form, set, canEdit, standalone, selectedUnitId, setSelectedUnitId, allUnits, isNew, save }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>Контактная информация</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {standalone && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Коллектив</Label>
              <Select value={selectedUnitId} onValueChange={setSelectedUnitId} disabled={!canEdit}>
                <SelectTrigger><SelectValue placeholder="Без привязки (можно выбрать позже)" /></SelectTrigger>
                <SelectContent>
                  {allUnits?.map((u: any) => (
                    <SelectItem key={u.unit_id} value={u.unit_id}>{u.unit_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label>ФИО *</Label>
            <Input value={form.full_name} onChange={(e: any) => set("full_name", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Должность</Label>
            <Input value={form.job_title} onChange={(e: any) => set("job_title", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Роль</Label>
            <Select value={form.contact_role} onValueChange={(v: string) => set("contact_role", v)} disabled={!canEdit}>
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
            <Input type="email" value={form.email} onChange={(e: any) => set("email", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Телефон</Label>
            <Input value={form.phone} onChange={(e: any) => set("phone", e.target.value)} disabled={!canEdit} />
          </div>
          <div className="space-y-2">
            <Label>Telegram</Label>
            <Input value={form.telegram} onChange={(e: any) => set("telegram", e.target.value)} disabled={!canEdit} placeholder="@username" />
          </div>
          <div className="flex items-center gap-3 pt-6">
            <Switch checked={form.is_primary} onCheckedChange={(v: boolean) => set("is_primary", v)} disabled={!canEdit} />
            <Label>Основной контакт</Label>
          </div>
        </CardContent>
      </Card>

      {/* Citation profiles */}
      <Card>
        <CardHeader><CardTitle>Профили в системах цитирования</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>ORCID</Label>
            <Input value={form.orcid} onChange={(e: any) => set("orcid", e.target.value)} disabled={!canEdit} placeholder="0000-0000-0000-0000" />
          </div>
          <div className="space-y-2">
            <Label>Scopus Author ID</Label>
            <Input value={form.scopus_id} onChange={(e: any) => set("scopus_id", e.target.value)} disabled={!canEdit} placeholder="57..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Google Scholar</Label>
            <Input value={form.scholar_url} onChange={(e: any) => set("scholar_url", e.target.value)} disabled={!canEdit} placeholder="https://scholar.google.com/citations?user=..." />
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader><CardTitle>Дополнительно</CardTitle></CardHeader>
        <CardContent className="grid gap-4">
          <div className="space-y-2">
            <Label>Доступность</Label>
            <Textarea value={form.availability_notes} onChange={(e: any) => set("availability_notes", e.target.value)} disabled={!canEdit} rows={2} placeholder="Когда доступен, предпочтительный способ связи..." />
          </div>
          <div className="space-y-2">
            <Label>Заметки</Label>
            <Textarea value={form.notes} onChange={(e: any) => set("notes", e.target.value)} disabled={!canEdit} rows={3} />
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
