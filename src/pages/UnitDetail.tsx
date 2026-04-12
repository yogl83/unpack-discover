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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Save, Trash2, Plus, Brain, Lightbulb, Briefcase, Users, UserPlus, Pencil, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { MarkdownWysiwyg } from "@/components/partner/MarkdownWysiwyg";
import { UnitPortfolioFiles } from "@/components/unit/UnitPortfolioFiles";
import { PortfolioItemFiles, PortfolioItemFilesHandle } from "@/components/unit/PortfolioItemFiles";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { hypothesisStatusLabels, memberRoleLabels, portfolioTypeLabels, portfolioFieldConfig, projectSubtypeLabels, ridSubtypeLabels } from "@/lib/labels";
const statusLabels = hypothesisStatusLabels;

const emptyPortfolioForm = {
  title: "", item_type: "project", project_subtype: "", rid_subtype: "", organization_name: "", description: "",
  year_from: "", year_to: "", url: "", notes: "", authors: "", registration_number: "", country: "RU",
};

const portfolioTitlePlaceholders: Record<string, string> = {
  project: "Наименование проекта",
  publication: "Название публикации",
  rid: "Название РИД",
  product: "Название продукта",
  other: "Название",
};

const portfolioDialogTitles: Record<string, { new: string; edit: string }> = {
  project: { new: "Новый проект", edit: "Редактировать проект" },
  publication: { new: "Новая публикация", edit: "Редактировать публикацию" },
  rid: { new: "Новый РИД", edit: "Редактировать РИД" },
  product: { new: "Новый продукт", edit: "Редактировать продукт" },
  other: { new: "Новый элемент", edit: "Редактировать элемент" },
};

export default function UnitDetail() {
  const { id } = useParams();
  const isNew = id === "new";
  const navigate = useNavigate();
  const { canEdit, isAdmin } = useAuth();
  const qc = useQueryClient();

  const { data: item, isLoading } = useQuery({
    queryKey: ["unit", id],
    queryFn: async () => { const { data, error } = await supabase.from("miem_units").select("*").eq("unit_id", id!).single(); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const { data: competencies } = useQuery({
    queryKey: ["unit-competencies", id],
    queryFn: async () => { const { data, error } = await supabase.from("competencies").select("*").eq("unit_id", id!).order("competency_name"); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const { data: hypotheses } = useQuery({
    queryKey: ["unit-hypotheses", id],
    queryFn: async () => { const { data, error } = await supabase.from("collaboration_hypotheses").select("*, partners(partner_name), partner_needs(title)").eq("unit_id", id!).order("updated_at", { ascending: false }); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const { data: portfolio } = useQuery({
    queryKey: ["unit-portfolio", id],
    queryFn: async () => { const { data, error } = await supabase.from("unit_portfolio_items").select("*").eq("unit_id", id!).order("year_from", { ascending: false }); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const { data: unitContacts } = useQuery({
    queryKey: ["unit-contacts", id],
    queryFn: async () => { const { data, error } = await supabase.from("unit_contacts").select("*").eq("unit_id", id!).order("is_primary", { ascending: false }); if (error) throw error; return data; },
    enabled: !isNew,
  });

  const { data: allContacts } = useQuery({
    queryKey: ["all-unit-contacts"],
    queryFn: async () => { const { data, error } = await supabase.from("unit_contacts").select("*").order("full_name"); if (error) throw error; return data; },
    enabled: showAddMemberDialog,
  });

  const { data: memberships } = useQuery({
    queryKey: ["unit-memberships", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unit_contact_memberships")
        .select("*, unit_contacts(full_name, job_title, email)")
        .eq("unit_id", id!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const [form, setForm] = useState({
    unit_name: "", unit_type: "", team_summary: "", research_area: "",
    business_problem_focus: "", application_domain: "", industry_fit: "", end_customer_fit: "",
    value_chain_role: "", readiness_level: "", discussion_readiness: "", notes: "",
    portfolio_summary: "",
  });
  const [leadContactId, setLeadContactId] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setForm(Object.fromEntries(Object.keys(form).map(k => [k, (item as any)[k] || ""])) as any);
      setLeadContactId((item as any).lead_contact_id || null);
    }
  }, [item]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form.unit_name) { toast.error("Укажите название"); throw new Error("required"); }
      const payload = { ...form, lead_contact_id: leadContactId } as any;
      if (isNew) { const { error } = await supabase.from("miem_units").insert(payload); if (error) throw error; }
      else { const { error } = await supabase.from("miem_units").update(payload).eq("unit_id", id!); if (error) throw error; }
    },
    onSuccess: () => { toast.success(isNew ? "Создано" : "Сохранено"); qc.invalidateQueries({ queryKey: ["units"] }); if (isNew) navigate("/units"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async () => { const { error } = await supabase.from("miem_units").delete().eq("unit_id", id!); if (error) throw error; },
    onSuccess: () => { toast.success("Удалено"); navigate("/units"); },
  });

  // Membership mutations
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [addMemberContact, setAddMemberContact] = useState("");
  const [addMemberRole, setAddMemberRole] = useState("other");

  const addMembership = useMutation({
    mutationFn: async () => {
      if (!addMemberContact) { toast.error("Выберите контакт"); throw new Error("required"); }
      const { error } = await supabase.from("unit_contact_memberships").insert({
        unit_id: id!,
        unit_contact_id: addMemberContact,
        member_role: addMemberRole,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Участник добавлен");
      setAddMemberContact("");
      setAddMemberRole("other");
      setShowAddMemberDialog(false);
      qc.invalidateQueries({ queryKey: ["unit-memberships", id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMembership = useMutation({
    mutationFn: async (membershipId: string) => {
      const { error } = await supabase.from("unit_contact_memberships").delete().eq("membership_id", membershipId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Участник удалён"); qc.invalidateQueries({ queryKey: ["unit-memberships", id] }); },
  });

  const setMemberLead = useMutation({
    mutationFn: async ({ membershipId, contactId }: { membershipId: string; contactId: string }) => {
      const { error } = await supabase.rpc("assign_unit_lead", {
        p_unit_id: id!,
        p_membership_id: membershipId,
        p_contact_id: contactId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Руководитель назначен");
      qc.invalidateQueries({ queryKey: ["unit-memberships", id] });
      qc.invalidateQueries({ queryKey: ["unit", id] });
    },
  });

  // Portfolio CRUD
   const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);
   const [editingPortfolioId, setEditingPortfolioId] = useState<string | null>(null);
   const [pForm, setPForm] = useState({ ...emptyPortfolioForm });
   const [portfolioTypePreset, setPortfolioTypePreset] = useState(false);
   const portfolioFilesRef = useRef<PortfolioItemFilesHandle>(null);

  const openNewPortfolio = () => {
    setPForm({ ...emptyPortfolioForm });
    setEditingPortfolioId(null);
    setPortfolioTypePreset(false);
    setPortfolioDialogOpen(true);
  };

  const openEditPortfolio = (item: any) => {
    setPForm({
      title: item.title || "",
      item_type: item.item_type || "project",
      project_subtype: item.project_subtype || "",
      rid_subtype: (item as any).rid_subtype || "",
      organization_name: item.organization_name || "",
      description: item.description || "",
      year_from: item.year_from?.toString() || "",
      year_to: item.year_to?.toString() || "",
      url: item.url || "",
      notes: item.notes || "",
      authors: (item as any).authors || "",
      registration_number: (item as any).registration_number || "",
      country: (item as any).country || "RU",
    });
    setEditingPortfolioId(item.portfolio_item_id);
    setPortfolioTypePreset(true);
    setPortfolioDialogOpen(true);
  };

  const savePortfolio = useMutation({
    mutationFn: async () => {
      if (!pForm.title) { toast.error("Укажите название"); throw new Error("required"); }
      const payload: any = {
        title: pForm.title,
        item_type: pForm.item_type,
        project_subtype: pForm.item_type === "project" ? (pForm.project_subtype || null) : null,
        rid_subtype: pForm.item_type === "rid" ? (pForm.rid_subtype || null) : null,
        authors: pForm.item_type === "rid" ? (pForm.authors || null) : null,
        registration_number: pForm.item_type === "rid" ? (pForm.registration_number || null) : null,
        country: pForm.item_type === "rid" ? (pForm.country || null) : null,
        organization_name: pForm.organization_name || null,
        description: pForm.description || null,
        year_from: pForm.year_from ? parseInt(pForm.year_from) : null,
        year_to: pForm.year_to ? parseInt(pForm.year_to) : null,
        url: pForm.url || null,
        notes: pForm.notes || null,
        unit_id: id!,
      };
      if (editingPortfolioId) {
        const { error } = await supabase.from("unit_portfolio_items").update(payload as any).eq("portfolio_item_id", editingPortfolioId);
        if (error) throw error;
        return { id: editingPortfolioId, wasCreate: false };
      } else {
        const { data, error } = await supabase.from("unit_portfolio_items").insert(payload as any).select("portfolio_item_id").single();
        if (error) throw error;
        return { id: (data as any).portfolio_item_id, wasCreate: true };
      }
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ["unit-portfolio", id] });
      if (result.wasCreate && portfolioFilesRef.current?.hasPendingFiles()) {
        try {
          await portfolioFilesRef.current.flushPendingFiles(result.id);
        } catch (err: any) {
          toast.error("Ошибка загрузки файлов: " + err.message);
        }
      }
      toast.success("Сохранено");
      setPortfolioDialogOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deletePortfolio = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("unit_portfolio_items").delete().eq("portfolio_item_id", itemId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Удалено"); qc.invalidateQueries({ queryKey: ["unit-portfolio", id] }); },
  });

  const setP = (k: string, v: string) => setPForm(p => ({ ...p, [k]: v }));

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  if (!isNew && isLoading) return <p className="text-muted-foreground p-4">Загрузка...</p>;

  // Contacts not yet in memberships
  const availableContacts = unitContacts?.filter(
    uc => !memberships?.some(m => m.unit_contact_id === uc.unit_contact_id)
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/units"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новый коллектив" : form.unit_name}</h1>
        {!isNew && isAdmin && (
          <ConfirmDialog title="Удалить коллектив?" description="Коллектив и все связанные данные будут удалены безвозвратно." onConfirm={() => del.mutate()} />
        )}
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Информация</TabsTrigger>
          {!isNew && (
            <>
              <TabsTrigger value="contacts" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />Коллектив
                {unitContacts?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{unitContacts.length}</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="portfolio" className="gap-1.5">
                <Briefcase className="h-3.5 w-3.5" />Портфолио
                {portfolio?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{portfolio.length}</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="competencies" className="gap-1.5">
                <Brain className="h-3.5 w-3.5" />Компетенции
                {competencies?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{competencies.length}</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="hypotheses" className="gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />Гипотезы
                {hypotheses?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{hypotheses.length}</Badge> : null}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="info" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Основная информация</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label>Название *</Label><Input value={form.unit_name} onChange={e => set("unit_name", e.target.value)} disabled={!canEdit} /></div>
              <div className="space-y-2">
                <Label>Тип</Label>
                <Select value={form.unit_type} onValueChange={v => set("unit_type", v)} disabled={!canEdit}>
                  <SelectTrigger><SelectValue placeholder="Выберите" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lab">Лаборатория</SelectItem>
                    <SelectItem value="project_group">Проектная группа</SelectItem>
                    <SelectItem value="center">Центр</SelectItem>
                    <SelectItem value="department">Департамент</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Руководитель</Label>
                {!isNew && unitContacts?.length ? (
                  <Select value={leadContactId || ""} onValueChange={v => setLeadContactId(v || null)} disabled={!canEdit}>
                    <SelectTrigger><SelectValue placeholder="Выберите контакт" /></SelectTrigger>
                    <SelectContent>
                      {unitContacts.map(uc => (
                        <SelectItem key={uc.unit_contact_id} value={uc.unit_contact_id}>
                          {uc.full_name}{uc.job_title ? ` — ${uc.job_title}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input disabled placeholder={isNew ? "Сначала создайте коллектив, затем добавьте контакты" : "Нет контактов — добавьте во вкладке Коллектив"} />
                )}
              </div>
              <div className="space-y-2"><Label>Область исследований</Label><Input value={form.research_area} onChange={e => set("research_area", e.target.value)} disabled={!canEdit} /></div>
              <div className="space-y-2"><Label>Область применения</Label><Input value={form.application_domain} onChange={e => set("application_domain", e.target.value)} disabled={!canEdit} /></div>
              <div className="space-y-2"><Label>Отрасль</Label><Input value={form.industry_fit} onChange={e => set("industry_fit", e.target.value)} disabled={!canEdit} /></div>
              <div className="space-y-2"><Label>Конечный потребитель</Label><Input value={form.end_customer_fit} onChange={e => set("end_customer_fit", e.target.value)} disabled={!canEdit} /></div>
              <div className="space-y-2"><Label>Роль в цепочке</Label><Input value={form.value_chain_role} onChange={e => set("value_chain_role", e.target.value)} disabled={!canEdit} /></div>
              <div className="space-y-2"><Label>Уровень готовности</Label><Input value={form.readiness_level} onChange={e => set("readiness_level", e.target.value)} disabled={!canEdit} /></div>
              <div className="space-y-2"><Label>Готовность к обсуждению</Label><Input value={form.discussion_readiness} onChange={e => set("discussion_readiness", e.target.value)} disabled={!canEdit} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Описание команды</Label><Textarea value={form.team_summary} onChange={e => set("team_summary", e.target.value)} disabled={!canEdit} rows={3} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Фокус бизнес-проблем</Label><Textarea value={form.business_problem_focus} onChange={e => set("business_problem_focus", e.target.value)} disabled={!canEdit} rows={3} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Заметки</Label><Textarea value={form.notes} onChange={e => set("notes", e.target.value)} disabled={!canEdit} rows={2} /></div>
            </CardContent>
          </Card>
          {canEdit && <Button onClick={() => save.mutate()} disabled={save.isPending}><Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}</Button>}
        </TabsContent>

        {/* Portfolio tab — structured like partner profile */}
        {!isNew && (
          <TabsContent value="portfolio" className="space-y-6">
            {/* Portfolio summary */}
            <Card>
              <CardHeader><CardTitle>Достижения и результаты группы</CardTitle></CardHeader>
              <CardContent>
                {canEdit ? (
                  <div className="space-y-2">
                    <MarkdownWysiwyg
                      value={form.portfolio_summary}
                      onChange={(v) => set("portfolio_summary", v)}
                    />
                    <Button size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
                      <Save className="mr-1 h-3.5 w-3.5" />Сохранить описание
                    </Button>
                  </div>
                ) : form.portfolio_summary ? (
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{form.portfolio_summary}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Описание не заполнено</p>
                )}
              </CardContent>
            </Card>

            {/* Accordion sections by type */}
            <Card>
              <CardContent className="pt-6">
                <Accordion type="multiple" defaultValue={Object.keys(portfolioTypeLabels)}>
                  {Object.entries(portfolioTypeLabels).map(([typeKey, typeLabel]) => {
                    const items = portfolio?.filter(p => p.item_type === typeKey) || [];
                    return (
                      <AccordionItem key={typeKey} value={typeKey}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-2">
                            <span>{typeLabel}</span>
                            <Badge variant="secondary" className="h-5 px-1.5 text-xs">{items.length}</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-3">
                            {canEdit && (
                              <Button size="sm" variant="outline" onClick={() => { setPForm({ ...emptyPortfolioForm, item_type: typeKey }); setEditingPortfolioId(null); setPortfolioTypePreset(true); setPortfolioDialogOpen(true); }}>
                                <Plus className="mr-1 h-3.5 w-3.5" />Добавить
                              </Button>
                            )}
                            {items.length === 0 ? (
                              <p className="text-muted-foreground text-sm py-2">Нет элементов</p>
                            ) : (
                              <div className="space-y-2">
                                {items.map(p => (
                                  <div key={p.portfolio_item_id} className="flex items-start gap-3 rounded-md border p-3">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium">
                                          {p.url ? (
                                            <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                                              {p.title}<ExternalLink className="h-3 w-3" />
                                            </a>
                                          ) : p.title}
                                        </span>
                                        {(p as any).project_subtype && projectSubtypeLabels[(p as any).project_subtype] && (
                                          <Badge variant="outline" className="text-xs">{projectSubtypeLabels[(p as any).project_subtype]}</Badge>
                                        )}
                                        {(p as any).rid_subtype && ridSubtypeLabels[(p as any).rid_subtype] && (
                                          <Badge variant="outline" className="text-xs">{ridSubtypeLabels[(p as any).rid_subtype]}</Badge>
                                        )}
                                        {p.year_from && (
                                          <span className="text-muted-foreground text-xs">
                                            {p.year_from}{p.year_to ? `–${p.year_to}` : "–н.в."}
                                          </span>
                                        )}
                                      </div>
                                      {p.organization_name && <p className="text-sm text-muted-foreground">{p.organization_name}</p>}
                                      {p.description && <p className="text-sm text-muted-foreground mt-1">{p.description}</p>}
                                      <PortfolioItemFiles portfolioItemId={p.portfolio_item_id} itemSource="unit" editable={false} />
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

            {/* Files section */}
            <Card>
              <CardContent className="pt-6">
                <UnitPortfolioFiles unitId={id!} editable={canEdit} />
              </CardContent>
            </Card>

            {/* Portfolio item dialog */}
            <Dialog open={portfolioDialogOpen} onOpenChange={setPortfolioDialogOpen}>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>{editingPortfolioId ? (portfolioDialogTitles[pForm.item_type]?.edit || "Редактировать элемент") : (portfolioDialogTitles[pForm.item_type]?.new || "Новый элемент портфолио")}</DialogTitle>
                </DialogHeader>
                <ScrollArea className="flex-1 overflow-auto pr-4">
                  <div className="grid gap-4 py-2">
                    <div className="space-y-2"><Label>Название *</Label><Input value={pForm.title} onChange={e => setP("title", e.target.value)} placeholder={portfolioTitlePlaceholders[pForm.item_type] || "Название"} /></div>
                    <div className={`grid gap-4 ${portfolioTypePreset ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
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
                      <div className="space-y-2"><Label>{(portfolioFieldConfig[pForm.item_type] || portfolioFieldConfig.other).orgLabel}</Label><Input value={pForm.organization_name} onChange={e => setP("organization_name", e.target.value)} /></div>
                    </div>
                    {pForm.item_type === "project" && (
                      <div className="space-y-2">
                        <Label>Тип проекта</Label>
                        <Select value={pForm.project_subtype || "__none__"} onValueChange={v => setP("project_subtype", v === "__none__" ? "" : v)}>
                          <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Не указан</SelectItem>
                            {Object.entries(projectSubtypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {pForm.item_type === "rid" && (
                      <>
                        <div className="space-y-2">
                          <Label>Тип РИД</Label>
                          <Select value={pForm.rid_subtype || "__none__"} onValueChange={v => setP("rid_subtype", v === "__none__" ? "" : v)}>
                            <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Не указан</SelectItem>
                              {Object.entries(ridSubtypeLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>Авторы</Label><Input value={pForm.authors} onChange={e => setP("authors", e.target.value)} placeholder="Иванов И.И., Петров П.П." /></div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2"><Label>Номер регистрации</Label><Input value={pForm.registration_number} onChange={e => setP("registration_number", e.target.value)} placeholder="RU 2 123 456" /></div>
                          <div className="space-y-2"><Label>Страна</Label><Input value={pForm.country} onChange={e => setP("country", e.target.value)} placeholder="RU" /></div>
                        </div>
                      </>
                    )}
                    {(portfolioFieldConfig[pForm.item_type] || portfolioFieldConfig.other).hasYearTo ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2"><Label>{(portfolioFieldConfig[pForm.item_type] || portfolioFieldConfig.other).yearFromLabel}</Label><Input type="number" value={pForm.year_from} onChange={e => setP("year_from", e.target.value)} placeholder="2020" /></div>
                        <div className="space-y-2"><Label>{(portfolioFieldConfig[pForm.item_type] || portfolioFieldConfig.other).yearToLabel}</Label><Input type="number" value={pForm.year_to} onChange={e => setP("year_to", e.target.value)} placeholder="2024" /></div>
                      </div>
                    ) : (
                      <div className="space-y-2"><Label>{(portfolioFieldConfig[pForm.item_type] || portfolioFieldConfig.other).yearFromLabel}</Label><Input type="number" value={pForm.year_from} onChange={e => setP("year_from", e.target.value)} placeholder="2023" /></div>
                    )}
                    <div className="space-y-2"><Label>{(portfolioFieldConfig[pForm.item_type] || portfolioFieldConfig.other).urlLabel}</Label><Input value={pForm.url} onChange={e => setP("url", e.target.value)} placeholder={(portfolioFieldConfig[pForm.item_type] || portfolioFieldConfig.other).urlPlaceholder} /></div>
                    <div className="space-y-2"><Label>Описание</Label><Textarea value={pForm.description} onChange={e => setP("description", e.target.value)} rows={3} /></div>
                    <div className="space-y-2"><Label>Заметки</Label><Textarea value={pForm.notes} onChange={e => setP("notes", e.target.value)} rows={2} /></div>
                    <div className="space-y-2">
                      <Label>Файлы</Label>
                      <PortfolioItemFiles ref={portfolioFilesRef} portfolioItemId={editingPortfolioId || undefined} itemSource="unit" editable={true} />
                    </div>
                  </div>
                </ScrollArea>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setPortfolioDialogOpen(false)}>Отмена</Button>
                  <Button onClick={() => savePortfolio.mutate()} disabled={savePortfolio.isPending}>
                    <Save className="mr-2 h-4 w-4" />{editingPortfolioId ? "Сохранить" : "Добавить"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>
        )}

        {/* Competencies tab */}
        {!isNew && (
          <TabsContent value="competencies" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Компетенции</h2>
              {canEdit && <Button size="sm" variant="outline" asChild><Link to="/competencies/new"><Plus className="mr-1 h-4 w-4" />Добавить</Link></Button>}
            </div>
            {!competencies?.length ? (
              <p className="text-muted-foreground text-sm py-6 text-center">Нет компетенций</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Название</TableHead><TableHead>Тип</TableHead><TableHead>Область</TableHead><TableHead>Зрелость</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {competencies.map(c => (
                      <TableRow key={c.competency_id}>
                        <TableCell><Link to={`/competencies/${c.competency_id}`} className="font-medium text-primary hover:underline">{c.competency_name}</Link></TableCell>
                        <TableCell className="text-muted-foreground">{c.competency_type || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{c.application_domain || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{c.maturity_level || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* Hypotheses tab */}
        {!isNew && (
          <TabsContent value="hypotheses" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Гипотезы</h2>
              {canEdit && <Button size="sm" variant="outline" asChild><Link to="/hypotheses/new"><Plus className="mr-1 h-4 w-4" />Добавить</Link></Button>}
            </div>
            {!hypotheses?.length ? (
              <p className="text-muted-foreground text-sm py-6 text-center">Нет гипотез</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Название</TableHead><TableHead>Организация</TableHead><TableHead>Потребность</TableHead><TableHead>Статус</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {hypotheses.map(h => (
                      <TableRow key={h.hypothesis_id}>
                        <TableCell><Link to={`/hypotheses/${h.hypothesis_id}`} className="font-medium text-primary hover:underline">{h.title || "Без названия"}</Link></TableCell>
                        <TableCell className="text-muted-foreground">{(h.partners as any)?.partner_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{(h.partner_needs as any)?.title || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{statusLabels[h.hypothesis_status || ""] || h.hypothesis_status || "—"}</Badge></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* Contacts + Team Composition tab */}
        {!isNew && (
          <TabsContent value="contacts" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Состав коллектива
                  </CardTitle>
                  {canEdit && (
                    <Button size="sm" variant="outline" onClick={() => setShowAddMemberDialog(true)}>
                      <Plus className="mr-1 h-4 w-4" />Добавить
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {!unitContacts?.length ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">Нет контактов</p>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden sm:block rounded-lg border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ФИО</TableHead>
                            <TableHead>Должность</TableHead>
                            <TableHead>Роль</TableHead>
                            <TableHead>Действия</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {unitContacts.map(c => {
                            const isLead = c.unit_contact_id === leadContactId;
                            const membership = memberships?.find(m => m.unit_contact_id === c.unit_contact_id);
                            return (
                              <TableRow key={c.unit_contact_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/units/${id}/contacts/${c.unit_contact_id}`)}>
                                <TableCell className="font-medium text-primary">
                                  {c.full_name}
                                  {isLead && <Badge className="ml-2" variant="default">Руководитель</Badge>}
                                </TableCell>
                                <TableCell className="text-muted-foreground">{c.job_title || "—"}</TableCell>
                                <TableCell className="text-muted-foreground">{memberRoleLabels[c.contact_role || ""] || c.contact_role || "—"}</TableCell>
                                <TableCell onClick={e => e.stopPropagation()}>
                                  <div className="flex gap-1">
                                    {canEdit && !isLead && (
                                      <>
                                        <ConfirmDialog
                                          title="Удалить члена коллектива"
                                          description={`Удалить ${c.full_name} из коллектива? Это действие нельзя отменить.`}
                                          onConfirm={async () => {
                                            const { error } = await supabase.from("unit_contacts").delete().eq("unit_contact_id", c.unit_contact_id);
                                            if (error) { toast.error("Ошибка удаления"); return; }
                                            toast.success("Удалено");
                                            qc.invalidateQueries({ queryKey: ["unit-contacts", id] });
                                            qc.invalidateQueries({ queryKey: ["unit-memberships", id] });
                                          }}
                                          triggerLabel=""
                                          triggerSize="icon"
                                          triggerClassName="h-8 w-8"
                                          variant="ghost"
                                        />
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile cards */}
                    <div className="sm:hidden space-y-3">
                      {unitContacts.map(c => {
                        const isLead = c.unit_contact_id === leadContactId;
                        const membership = memberships?.find(m => m.unit_contact_id === c.unit_contact_id);
                        return (
                          <div
                            key={c.unit_contact_id}
                            className="rounded-lg border p-3 space-y-1.5 cursor-pointer hover:bg-muted/50"
                            onClick={() => navigate(`/units/${id}/contacts/${c.unit_contact_id}`)}
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-primary">{c.full_name}</span>
                              {isLead && <Badge variant="default">Руководитель</Badge>}
                            </div>
                            {c.job_title && <p className="text-sm text-muted-foreground">{c.job_title}</p>}
                            {c.contact_role && (
                              <Badge variant="outline" className="text-xs">
                                {memberRoleLabels[c.contact_role] || c.contact_role}
                              </Badge>
                            )}
                            {canEdit && !isLead && (
                              <div className="pt-1 flex gap-1" onClick={e => e.stopPropagation()}>
                                <ConfirmDialog
                                  title="Удалить члена коллектива"
                                  description={`Удалить ${c.full_name} из коллектива? Это действие нельзя отменить.`}
                                  onConfirm={async () => {
                                    const { error } = await supabase.from("unit_contacts").delete().eq("unit_contact_id", c.unit_contact_id);
                                    if (error) { toast.error("Ошибка удаления"); return; }
                                    toast.success("Удалено");
                                    qc.invalidateQueries({ queryKey: ["unit-contacts", id] });
                                    qc.invalidateQueries({ queryKey: ["unit-memberships", id] });
                                  }}
                                  triggerLabel=""
                                  triggerSize="icon"
                                  triggerClassName="h-7 w-7"
                                  variant="ghost"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Add member dialog */}
      <Dialog open={showAddMemberDialog} onOpenChange={(open) => { if (!open) { setAddMemberContact(""); setAddMemberRole("other"); } setShowAddMemberDialog(open); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Добавить в коллектив</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Сотрудник</Label>
              <Select value={addMemberContact} onValueChange={setAddMemberContact}>
                <SelectTrigger><SelectValue placeholder="Выберите сотрудника" /></SelectTrigger>
                <SelectContent>
                  {(allContacts || [])
                    .filter(c => !(memberships || []).some(m => m.unit_contact_id === c.unit_contact_id))
                    .map(c => (
                      <SelectItem key={c.unit_contact_id} value={c.unit_contact_id}>
                        {c.full_name}{c.job_title ? ` — ${c.job_title}` : ""}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Роль в команде</Label>
              <Select value={addMemberRole} onValueChange={setAddMemberRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(memberRoleLabels).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddMemberDialog(false)}>Отмена</Button>
            <Button onClick={() => addMembership.mutate()} disabled={!addMemberContact || addMembership.isPending}>
              Добавить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
