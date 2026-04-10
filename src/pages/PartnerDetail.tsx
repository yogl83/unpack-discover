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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Save, Trash2, Plus, Users, ClipboardList, Lightbulb, FileText, ShieldCheck } from "lucide-react";
import { PartnerProfileTab } from "@/components/partner/PartnerProfileTab";
import { ProfileFreshnessBadge } from "@/components/partner/ProfileFreshnessBadge";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const statusLabels: Record<string, string> = {
  new: "Новый", in_review: "На рассмотрении", in_progress: "В работе",
  active: "Активный", on_hold: "На паузе", archived: "Архив",
  hypothesis: "Гипотеза", confirmed: "Подтверждена", resolved: "Решена", rejected: "Отклонена",
  testing: "Тестируется",
};

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
    enabled: !isNew && !!id,
  });

  // Related data queries
  const { data: contacts } = useQuery({
    queryKey: ["partner-contacts", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("contacts").select("*").eq("partner_id", id!).order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: needs } = useQuery({
    queryKey: ["partner-needs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_needs").select("*").eq("partner_id", id!).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: hypotheses } = useQuery({
    queryKey: ["partner-hypotheses", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("collaboration_hypotheses").select("*, miem_units(unit_name), partner_needs(title)").eq("partner_id", id!).order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: sources } = useQuery({
    queryKey: ["partner-sources", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("sources").select("*").eq("partner_id", id!).order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !isNew,
  });

  const { data: evidence } = useQuery({
    queryKey: ["partner-evidence", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("evidence").select("*, sources(title)").eq("partner_id", id!).order("created_at", { ascending: false });
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
      if (isNew) navigate("/partners");
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
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild><Link to="/partners"><ArrowLeft className="h-4 w-4" /></Link></Button>
        <h1 className="text-2xl font-bold">{isNew ? "Новый партнер" : form.partner_name}</h1>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">Информация</TabsTrigger>
          {!isNew && (
            <>
              <TabsTrigger value="profile" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />Профайл
              </TabsTrigger>
              <TabsTrigger value="contacts" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />Контакты
                {contacts?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{contacts.length}</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="needs" className="gap-1.5">
                <ClipboardList className="h-3.5 w-3.5" />Потребности
                {needs?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{needs.length}</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="hypotheses" className="gap-1.5">
                <Lightbulb className="h-3.5 w-3.5" />Гипотезы
                {hypotheses?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{hypotheses.length}</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="sources" className="gap-1.5">
                <FileText className="h-3.5 w-3.5" />Источники
                {sources?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{sources.length}</Badge> : null}
              </TabsTrigger>
              <TabsTrigger value="evidence" className="gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />Подтверждения
                {evidence?.length ? <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">{evidence.length}</Badge> : null}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        {/* === INFO TAB === */}
        <TabsContent value="info" className="space-y-6">
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
                <Textarea value={form.technology_profile} onChange={e => set("technology_profile", e.target.value)} disabled={!canEdit} rows={2} />
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
          <div className="flex items-center gap-3">
            {canEdit && (
              <Button onClick={() => save.mutate()} disabled={!form.partner_name.trim() || save.isPending}>
                <Save className="mr-2 h-4 w-4" />{isNew ? "Создать" : "Сохранить"}
              </Button>
            )}
            {!isNew && isAdmin && (
              <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => { if (confirm("Удалить партнера и все связанные данные?")) del.mutate(); }}>
                <Trash2 className="mr-1 h-4 w-4" />Удалить
              </Button>
            )}
          </div>
        </TabsContent>

        {/* === PROFILE TAB === */}
        {!isNew && id && (
          <TabsContent value="profile">
            <PartnerProfileTab
              partnerId={id}
              partnerName={form.partner_name}
              legacyProfile={{
                company_profile: form.company_profile,
                technology_profile: form.technology_profile,
                strategic_priorities: form.strategic_priorities,
              }}
            />
          </TabsContent>
        )}

        {/* === CONTACTS TAB === */}
        {!isNew && (
          <TabsContent value="contacts" className="space-y-6">
            {/* Partner contacts */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Контакты партнёра</h2>
                {canEdit && (
                  <Button size="sm" variant="outline" onClick={() => navigate(`/partners/${id}/contacts/new`)}>
                    <Plus className="mr-1 h-4 w-4" />Добавить
                  </Button>
                )}
              </div>
              {!contacts?.length ? (
                <p className="text-muted-foreground text-sm py-6 text-center">Нет контактов</p>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ФИО</TableHead>
                        <TableHead>Должность</TableHead>
                        <TableHead>Тип</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Телефон</TableHead>
                        <TableHead>Основной</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contacts.map(c => (
                        <TableRow key={c.contact_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/partners/${id}/contacts/${c.contact_id}`)}>
                          <TableCell className="font-medium text-primary">{c.full_name}</TableCell>
                          <TableCell className="text-muted-foreground">{c.job_title || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {{"official":"Офиц.","warm":"Тёплый","operational":"Операт.","decision_maker":"ЛПР","technical":"Техн.","other":"Другой"}[(c as any).contact_kind] || (c as any).contact_kind || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{c.phone || "—"}</TableCell>
                          <TableCell>{c.is_primary ? <Badge variant="default">Да</Badge> : "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>

            {/* MIEM contacts (read-only, from linked units via hypotheses) */}
            <MiemContactsBlock partnerId={id!} />
          </TabsContent>
        )}

        {/* === NEEDS TAB === */}
        {!isNew && (
          <TabsContent value="needs" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Потребности</h2>
              {canEdit && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/needs/new"><Plus className="mr-1 h-4 w-4" />Добавить</Link>
                </Button>
              )}
            </div>
            {!needs?.length ? (
              <p className="text-muted-foreground text-sm py-6 text-center">Нет потребностей</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Приоритет</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needs.map(n => (
                      <TableRow key={n.need_id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Link to={`/needs/${n.need_id}`} className="font-medium text-primary hover:underline">{n.title}</Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{n.need_type || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{statusLabels[n.need_status || ""] || n.need_status || "—"}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{n.priority_level || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* === HYPOTHESES TAB === */}
        {!isNew && (
          <TabsContent value="hypotheses" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Гипотезы сотрудничества</h2>
              {canEdit && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/hypotheses/new"><Plus className="mr-1 h-4 w-4" />Добавить</Link>
                </Button>
              )}
            </div>
            {!hypotheses?.length ? (
              <p className="text-muted-foreground text-sm py-6 text-center">Нет гипотез</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Потребность</TableHead>
                      <TableHead>Подразделение</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Уверенность</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hypotheses.map(h => (
                      <TableRow key={h.hypothesis_id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>
                          <Link to={`/hypotheses/${h.hypothesis_id}`} className="font-medium text-primary hover:underline">
                            {h.title || "Без названия"}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{(h.partner_needs as any)?.title || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{(h.miem_units as any)?.unit_name || "—"}</TableCell>
                        <TableCell><Badge variant="secondary">{statusLabels[h.hypothesis_status || ""] || h.hypothesis_status || "—"}</Badge></TableCell>
                        <TableCell className="text-muted-foreground">{h.confidence_level || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* === SOURCES TAB === */}
        {!isNew && (
          <TabsContent value="sources" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Источники</h2>
              {canEdit && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/sources/new"><Plus className="mr-1 h-4 w-4" />Добавить</Link>
                </Button>
              )}
            </div>
            {!sources?.length ? (
              <p className="text-muted-foreground text-sm py-6 text-center">Нет источников</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Название</TableHead>
                      <TableHead>Тип</TableHead>
                      <TableHead>Издатель</TableHead>
                      <TableHead>Дата</TableHead>
                      <TableHead>Надёжность</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sources.map(s => (
                      <TableRow key={s.source_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/sources/${s.source_id}`)}>
                        <TableCell className="font-medium text-primary">{s.title}</TableCell>
                        <TableCell className="text-muted-foreground">{s.source_type || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{s.publisher || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{s.publication_date || "—"}</TableCell>
                        <TableCell>
                          {s.source_reliability ? (
                            <Badge variant="outline">{s.source_reliability}</Badge>
                          ) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}

        {/* === EVIDENCE TAB === */}
        {!isNew && (
          <TabsContent value="evidence" className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Подтверждения</h2>
              {canEdit && (
                <Button size="sm" variant="outline" asChild>
                  <Link to="/evidence/new"><Plus className="mr-1 h-4 w-4" />Добавить</Link>
                </Button>
              )}
            </div>
            {!evidence?.length ? (
              <p className="text-muted-foreground text-sm py-6 text-center">Нет подтверждений</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Сущность</TableHead>
                      <TableHead>Поле</TableHead>
                      <TableHead>Значение</TableHead>
                      <TableHead>Уверенность</TableHead>
                      <TableHead>Метод</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evidence.map(e => (
                      <TableRow key={e.evidence_id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/evidence/${e.evidence_id}`)}>
                        <TableCell className="text-muted-foreground">{e.entity_type}</TableCell>
                        <TableCell className="font-medium">{e.field_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground max-w-[200px] truncate">{e.field_value || "—"}</TableCell>
                        <TableCell>
                          {e.confidence_level ? (
                            <Badge variant="outline">{e.confidence_level}</Badge>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{e.data_collection_method || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function MiemContactsBlock({ partnerId }: { partnerId: string }) {
  // Get unit IDs linked to this partner via hypotheses
  const { data: unitIds } = useQuery({
    queryKey: ["partner-linked-units", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collaboration_hypotheses")
        .select("unit_id, miem_units(unit_name)")
        .eq("partner_id", partnerId)
        .not("unit_id", "is", null);
      if (error) throw error;
      const unique = new Map<string, string>();
      data?.forEach(h => {
        if (h.unit_id && (h.miem_units as any)?.unit_name) {
          unique.set(h.unit_id, (h.miem_units as any).unit_name);
        }
      });
      return Array.from(unique.entries()).map(([id, name]) => ({ unit_id: id, unit_name: name }));
    },
  });

  const { data: unitContacts } = useQuery({
    queryKey: ["partner-miem-contacts", unitIds?.map(u => u.unit_id)],
    queryFn: async () => {
      if (!unitIds?.length) return [];
      const { data, error } = await supabase
        .from("unit_contacts")
        .select("*")
        .in("unit_id", unitIds.map(u => u.unit_id))
        .order("is_primary", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!unitIds?.length,
  });

  if (!unitIds?.length) return null;

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Контакты МИЭМ</h2>
      {!unitContacts?.length ? (
        <p className="text-muted-foreground text-sm py-4 text-center">
          Нет контактов в связанных коллективах
        </p>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ФИО</TableHead>
                <TableHead>Коллектив</TableHead>
                <TableHead>Должность</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Роль</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unitContacts.map(c => (
                <TableRow key={c.unit_contact_id}>
                  <TableCell className="font-medium">{c.full_name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {unitIds.find(u => u.unit_id === c.unit_id)?.unit_name || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{c.job_title || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.contact_role || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
