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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Save, Plus, Pencil, ExternalLink, Download, Loader2, FileText } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";
import { MarkdownWysiwyg } from "@/components/partner/MarkdownWysiwyg";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { portfolioTypeLabels, portfolioFieldConfig, projectSubtypeLabels, ridSubtypeLabels } from "@/lib/labels";
import { PortfolioItemFiles, PortfolioItemFilesHandle } from "@/components/unit/PortfolioItemFiles";

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

const emptyPortfolioForm = {
  title: "", item_type: "project", project_subtype: "", rid_subtype: "", organization_name: "", description: "",
  year_from: "", year_to: "", url: "", notes: "", authors: "", registration_number: "", country: "RU",
  doi: "", oa_status: "", oa_url: "", pdf_url: "", arxiv_url: "",
  biblio_volume: "", biblio_issue: "", biblio_first_page: "", biblio_last_page: "",
  publication_type: "", language: "", cited_by_count: "", primary_topic: "", publisher: "",
  source_type: "", keywords: "", is_retracted: false as boolean | false,
};

const publicationTypeLabels: Record<string, string> = {
  article: "Статья", "book-chapter": "Глава книги", "proceedings-article": "Тезисы конференции",
  book: "Книга", dissertation: "Диссертация", preprint: "Препринт",
  review: "Обзор", "edited-book": "Редакт. книга", other: "Другое",
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
  const portfolioFilesRef = useRef<PortfolioItemFilesHandle>(null);
  const [pForm, setPForm] = useState(emptyPortfolioForm);

  // Import publications state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importWorks, setImportWorks] = useState<any[]>([]);
  const [importSelected, setImportSelected] = useState<Set<number>>(new Set());
  const [importSaving, setImportSaving] = useState(false);

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
    elibrary_id: "",
    scholar_id: "",
    openalex_id: "",
    researcherid: "",
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
        elibrary_id: (item as any).elibrary_id || "",
        scholar_id: (item as any).scholar_id || "",
        openalex_id: (item as any).openalex_id || "",
        researcherid: (item as any).researcherid || "",
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
      qc.invalidateQueries({ queryKey: ["all-internal-contacts"] });
      qc.invalidateQueries({ queryKey: ["unit-contacts", unitId] });
      navigate(-1);
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
      qc.invalidateQueries({ queryKey: ["all-internal-contacts"] });
      qc.invalidateQueries({ queryKey: ["unit-contacts", unitId] });
      navigate(-1);
    },
  });

  // Portfolio mutations
  const savePortfolio = useMutation({
    mutationFn: async () => {
      if (!pForm.title.trim()) { toast.error("Укажите название"); throw new Error("required"); }
      const payload: any = {
        unit_contact_id: contactId!,
        title: pForm.title,
        item_type: pForm.item_type,
        project_subtype: pForm.item_type === "project" ? (pForm.project_subtype || null) : null,
        rid_subtype: pForm.item_type === "rid" ? (pForm.rid_subtype || null) : null,
        authors: (pForm.item_type === "rid" || pForm.item_type === "publication") ? (pForm.authors || null) : null,
        registration_number: pForm.item_type === "rid" ? (pForm.registration_number || null) : null,
        country: pForm.item_type === "rid" ? (pForm.country || null) : null,
        organization_name: pForm.organization_name || null,
        description: pForm.description || null,
        url: pForm.url || null,
        notes: pForm.notes || null,
        year_from: pForm.year_from ? Number(pForm.year_from) : null,
        year_to: pForm.year_to ? Number(pForm.year_to) : null,
        doi: pForm.item_type === "publication" ? (pForm.doi || null) : null,
        oa_status: pForm.item_type === "publication" ? (pForm.oa_status || null) : null,
        oa_url: pForm.item_type === "publication" ? (pForm.oa_url || null) : null,
        pdf_url: pForm.item_type === "publication" ? (pForm.pdf_url || null) : null,
        arxiv_url: pForm.item_type === "publication" ? (pForm.arxiv_url || null) : null,
        biblio_volume: pForm.item_type === "publication" ? (pForm.biblio_volume || null) : null,
        biblio_issue: pForm.item_type === "publication" ? (pForm.biblio_issue || null) : null,
        biblio_first_page: pForm.item_type === "publication" ? (pForm.biblio_first_page || null) : null,
        biblio_last_page: pForm.item_type === "publication" ? (pForm.biblio_last_page || null) : null,
      };
      if (editingPortfolioId) {
        const { error } = await supabase.from("contact_portfolio_items").update(payload).eq("portfolio_item_id", editingPortfolioId);
        if (error) throw error;
        return { id: editingPortfolioId, wasCreate: false };
      } else {
        const { data, error } = await supabase.from("contact_portfolio_items").insert(payload).select("portfolio_item_id").single();
        if (error) throw error;
        return { id: (data as any).portfolio_item_id, wasCreate: true };
      }
    },
    onSuccess: async (result) => {
      qc.invalidateQueries({ queryKey: ["contact-portfolio", contactId] });
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

  const hasImportIds = !!(form.openalex_id || form.orcid || form.scopus_id);

  const startImport = async () => {
    setImportDialogOpen(true);
    setImportLoading(true);
    setImportWorks([]);
    setImportSelected(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("fetch-author-publications", {
        body: { openalex_id: form.openalex_id || undefined, orcid: form.orcid || undefined, scopus_id: form.scopus_id || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Deduplicate against existing portfolio
      const existing = new Set(
        (portfolioItems || []).map((p: any) => `${(p.title || "").toLowerCase().trim()}|${p.year_from || ""}`)
      );
      const works = (data.works || []).map((w: any, i: number) => ({
        ...w,
        _index: i,
        _exists: existing.has(`${(w.title || "").toLowerCase().trim()}|${w.year || ""}`),
      }));
      setImportWorks(works);
    } catch (err: any) {
      toast.error("Ошибка загрузки: " + (err.message || "Неизвестная ошибка"));
      setImportDialogOpen(false);
    } finally {
      setImportLoading(false);
    }
  };

  const toggleImportItem = (idx: number) => {
    setImportSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const toggleAllImport = () => {
    const selectable = importWorks.filter(w => !w._exists);
    if (importSelected.size === selectable.length) {
      setImportSelected(new Set());
    } else {
      setImportSelected(new Set(selectable.map(w => w._index)));
    }
  };

  const oaStatusLabels: Record<string, string> = {
    gold: "открытый (gold)", green: "открытый (green)", hybrid: "гибридный",
    bronze: "бронзовый", diamond: "открытый (diamond)", closed: "закрытый",
  };

  const saveImported = async () => {
    const toSave = importWorks.filter(w => importSelected.has(w._index));
    if (toSave.length === 0) return;
    setImportSaving(true);
    try {
      const rows = toSave.map(w => ({
          unit_contact_id: contactId!,
          title: w.title,
          item_type: "publication",
          year_from: w.year || null,
          authors: w.authors || null,
          url: w.oa_url || w.url || null,
          organization_name: w.source_name || null,
          description: null,
          notes: w.abstract || null,
          doi: w.doi || null,
          oa_status: w.oa_status || null,
          oa_url: w.oa_url || null,
          pdf_url: w.pdf_url || null,
          arxiv_url: w.arxiv_url || null,
          biblio_volume: w.volume || null,
          biblio_issue: w.issue || null,
          biblio_first_page: w.first_page || null,
          biblio_last_page: w.last_page || null,
      }));
      const { error } = await supabase.from("contact_portfolio_items").insert(rows);
      if (error) throw error;
      toast.success(`Добавлено ${rows.length} публикаций`);
      qc.invalidateQueries({ queryKey: ["contact-portfolio", contactId] });
      setImportDialogOpen(false);
    } catch (err: any) {
      toast.error("Ошибка сохранения: " + err.message);
    } finally {
      setImportSaving(false);
    }
  };

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
      project_subtype: p.project_subtype || "",
      rid_subtype: (p as any).rid_subtype || "",
      organization_name: p.organization_name || "", description: p.description || "",
      year_from: p.year_from?.toString() || "", year_to: p.year_to?.toString() || "",
      url: p.url || "", notes: p.notes || "",
      authors: (p as any).authors || "",
      registration_number: (p as any).registration_number || "",
      country: (p as any).country || "RU",
      doi: p.doi || "", oa_status: p.oa_status || "", oa_url: p.oa_url || "",
      pdf_url: p.pdf_url || "", arxiv_url: p.arxiv_url || "",
      biblio_volume: p.biblio_volume || "", biblio_issue: p.biblio_issue || "",
      biblio_first_page: p.biblio_first_page || "", biblio_last_page: p.biblio_last_page || "",
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
                              <div className="flex gap-2 flex-wrap">
                                <Button size="sm" variant="outline" onClick={() => openAddPortfolio(type)}>
                                  <Plus className="mr-1 h-3.5 w-3.5" />Добавить
                                </Button>
                                {type === "publication" && hasImportIds && (
                                  <Button size="sm" variant="outline" onClick={startImport}>
                                    <Download className="mr-1 h-3.5 w-3.5" />Импорт из OpenAlex
                                  </Button>
                                )}
                              </div>
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
                                        {(p as any).project_subtype && projectSubtypeLabels[(p as any).project_subtype] && (
                                          <Badge variant="outline" className="text-xs">{projectSubtypeLabels[(p as any).project_subtype]}</Badge>
                                        )}
                                        {(p as any).rid_subtype && ridSubtypeLabels[(p as any).rid_subtype] && (
                                          <Badge variant="outline" className="text-xs">{ridSubtypeLabels[(p as any).rid_subtype]}</Badge>
                                        )}
                                        {p.year_from && (
                                          <span className="text-muted-foreground text-xs">
                                            {p.year_from}{p.year_to ? `–${p.year_to}` : (p.item_type !== "publication" ? "–н.в." : "")}
                                          </span>
                                        )}
                                      </div>
                                      {p.organization_name && <p className="text-sm text-muted-foreground">{p.organization_name}</p>}
                                      {p.item_type === "publication" && (() => {
                                        const bibParts: string[] = [];
                                        if (p.biblio_volume) bibParts.push(`Т. ${p.biblio_volume}`);
                                        if (p.biblio_issue) bibParts.push(`№ ${p.biblio_issue}`);
                                        if (p.biblio_first_page) bibParts.push(p.biblio_last_page && p.biblio_last_page !== p.biblio_first_page ? `С. ${p.biblio_first_page}–${p.biblio_last_page}` : `С. ${p.biblio_first_page}`);
                                        return bibParts.length > 0 ? <p className="text-xs text-muted-foreground">{bibParts.join(", ")}</p> : null;
                                      })()}
                                      {p.item_type === "publication" && (
                                        <div className="flex items-center gap-2 flex-wrap mt-1">
                                          {p.doi && (
                                            <a href={`https://doi.org/${(p.doi as string).replace("https://doi.org/", "")}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                                              DOI
                                            </a>
                                          )}
                                          {p.oa_status && (
                                            <Badge variant={p.oa_status === "closed" ? "secondary" : "default"} className="text-xs">
                                              {oaStatusLabels[p.oa_status] || p.oa_status}
                                            </Badge>
                                          )}
                                          {p.pdf_url && (
                                            <a href={p.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">PDF</a>
                                          )}
                                          {p.arxiv_url && (
                                            <a href={p.arxiv_url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">arXiv</a>
                                          )}
                                          {p.notes && (
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title={p.notes}>
                                              <FileText className="h-3.5 w-3.5" />Аннотация
                                            </span>
                                          )}
                                        </div>
                                      )}
                                      
                                      <PortfolioItemFiles portfolioItemId={p.portfolio_item_id} itemSource="contact" editable={false} />
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
              <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>{editingPortfolioId ? (portfolioDialogTitles[pForm.item_type]?.edit || "Редактировать элемент") : (portfolioDialogTitles[pForm.item_type]?.new || "Новый элемент")}</DialogTitle>
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
                    {pForm.item_type === "publication" && (
                      <>
                        <div className="space-y-2"><Label>Авторы</Label><Input value={pForm.authors} onChange={e => setP("authors", e.target.value)} placeholder="Иванов И.И., Петров П.П." /></div>
                        <div className="space-y-2"><Label>DOI</Label><Input value={pForm.doi} onChange={e => setP("doi", e.target.value)} placeholder="10.1234/example" /></div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          <div className="space-y-2"><Label>Том</Label><Input value={pForm.biblio_volume} onChange={e => setP("biblio_volume", e.target.value)} placeholder="12" /></div>
                          <div className="space-y-2"><Label>Номер</Label><Input value={pForm.biblio_issue} onChange={e => setP("biblio_issue", e.target.value)} placeholder="3" /></div>
                          <div className="space-y-2"><Label>С.</Label><Input value={pForm.biblio_first_page} onChange={e => setP("biblio_first_page", e.target.value)} placeholder="45" /></div>
                          <div className="space-y-2"><Label>По</Label><Input value={pForm.biblio_last_page} onChange={e => setP("biblio_last_page", e.target.value)} placeholder="67" /></div>
                        </div>
                        <div className="space-y-2">
                          <Label>Режим доступа</Label>
                          <Select value={pForm.oa_status || "__none__"} onValueChange={v => setP("oa_status", v === "__none__" ? "" : v)}>
                            <SelectTrigger><SelectValue placeholder="Не указан" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none__">Не указан</SelectItem>
                              {Object.entries(oaStatusLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2"><Label>OA URL</Label><Input value={pForm.oa_url} onChange={e => setP("oa_url", e.target.value)} placeholder="https://..." /></div>
                        <div className="space-y-2"><Label>PDF URL</Label><Input value={pForm.pdf_url} onChange={e => setP("pdf_url", e.target.value)} placeholder="https://..." /></div>
                        <div className="space-y-2"><Label>arXiv URL</Label><Input value={pForm.arxiv_url} onChange={e => setP("arxiv_url", e.target.value)} placeholder="https://arxiv.org/abs/..." /></div>
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
                    <div className="space-y-2"><Label>Аннотация</Label><Textarea value={pForm.notes} onChange={e => setP("notes", e.target.value)} rows={3} /></div>
                    <div className="space-y-2">
                      <Label>Файлы</Label>
                      <PortfolioItemFiles ref={portfolioFilesRef} portfolioItemId={editingPortfolioId || undefined} itemSource="contact" editable={true} />
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

            {/* Import publications dialog */}
            <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>Импорт публикаций из OpenAlex</DialogTitle>
                </DialogHeader>
                {importLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <span className="ml-2 text-muted-foreground">Загрузка публикаций...</span>
                  </div>
                ) : importWorks.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">Публикации не найдены</p>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-1 py-2">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={importSelected.size === importWorks.filter(w => !w._exists).length && importSelected.size > 0}
                          onCheckedChange={toggleAllImport}
                        />
                        Выбрать все ({importWorks.filter(w => !w._exists).length})
                      </label>
                      <span className="text-sm text-muted-foreground">
                        Найдено: {importWorks.length}, уже в портфолио: {importWorks.filter(w => w._exists).length}
                      </span>
                    </div>
                    <ScrollArea className="flex-1 overflow-auto border rounded-md">
                      <div className="divide-y">
                        {importWorks.map((w) => (
                          <label
                            key={w._index}
                            className={`flex items-start gap-3 p-3 cursor-pointer hover:bg-muted/50 ${w._exists ? "opacity-50" : ""}`}
                          >
                            <Checkbox
                              checked={importSelected.has(w._index)}
                              onCheckedChange={() => toggleImportItem(w._index)}
                              disabled={w._exists}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium leading-snug">{w.title}</p>
                              <div className="flex items-center gap-2 flex-wrap mt-1">
                                {w.year && <Badge variant="outline" className="text-xs">{w.year}</Badge>}
                                {w.source_name && <span className="text-xs text-muted-foreground italic">{w.source_name}</span>}
                                {w._exists && <Badge variant="secondary" className="text-xs">Уже добавлено</Badge>}
                              </div>
                              {w.authors && <p className="text-xs text-muted-foreground mt-1 truncate">{w.authors}</p>}
                            </div>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Отмена</Button>
                  <Button onClick={saveImported} disabled={importSaving || importSelected.size === 0}>
                    {importSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Добавить выбранные ({importSelected.size})
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
          <CitationField label="ORCID" value={form.orcid} onChange={(v: string) => set("orcid", v)} disabled={!canEdit} placeholder="0000-0003-0669-5694" urlTemplate="https://orcid.org/{id}" />
          <CitationField label="Scopus Author ID" value={form.scopus_id} onChange={(v: string) => set("scopus_id", v)} disabled={!canEdit} placeholder="25929447800" urlTemplate="https://www.scopus.com/authid/detail.uri?authorId={id}" />
          <CitationField label="eLibrary Author ID" value={form.elibrary_id} onChange={(v: string) => set("elibrary_id", v)} disabled={!canEdit} placeholder="177140" urlTemplate="https://elibrary.ru/author_profile.asp?id={id}" />
          <CitationField label="Google Scholar" value={form.scholar_id} onChange={(v: string) => set("scholar_id", v)} disabled={!canEdit} placeholder="ABSiyPEAAAAJ" urlTemplate="https://scholar.google.com/citations?user={id}" />
          <CitationField label="OpenAlex" value={form.openalex_id} onChange={(v: string) => set("openalex_id", v)} disabled={!canEdit} placeholder="A5059854048" urlTemplate="https://openalex.org/authors/{id}" />
          <CitationField label="ResearcherID" value={form.researcherid} onChange={(v: string) => set("researcherid", v)} disabled={!canEdit} placeholder="E-6562-2014" urlTemplate="https://www.webofscience.com/wos/author/rid/{id}" />
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

/* ── Citation profile field with auto-link ── */
function CitationField({ label, value, onChange, disabled, placeholder, urlTemplate }: {
  label: string; value: string; onChange: (v: string) => void; disabled: boolean; placeholder: string; urlTemplate: string;
}) {
  const url = value?.trim() ? urlTemplate.replace("{id}", value.trim()) : null;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-1.5">
        <Input value={value} onChange={(e: any) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className="flex-1" />
        {url && (
          <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10" asChild>
            <a href={url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
          </Button>
        )}
      </div>
    </div>
  );
}
