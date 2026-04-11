import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ProfileFreshnessBadge } from "./ProfileFreshnessBadge";
import { ProfileFileUpload } from "./ProfileFileUpload";
import { ProfilePdfExport } from "./ProfilePdfExport";
import { Plus, Edit, Send, Check, Archive, History, Save, Sparkles, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const SECTIONS = [
  { key: "summary_short", label: "Краткое описание" },
  { key: "company_overview", label: "Общие сведения о компании" },
  { key: "business_scale", label: "Масштаб и показатели деятельности" },
  { key: "technology_focus", label: "Технологический и продуктовый фокус" },
  { key: "strategic_priorities", label: "Стратегические направления" },
  { key: "relationship_with_other_universities", label: "Взаимодействие с другими университетами" },
  { key: "recent_news_and_plans", label: "Последние новости и планы развития" },
  { key: "key_events_and_touchpoints", label: "Ключевые мероприятия" },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

const statusLabels: Record<string, string> = {
  draft: "Черновик", review: "На рассмотрении", approved: "Утверждён", archived: "Архив",
};

interface ReferenceItem {
  number: number;
  text: string;
  url?: string;
}

interface Props {
  partnerId: string;
  partnerName: string;
  legacyProfile?: { company_profile?: string; technology_profile?: string; strategic_priorities?: string };
}

export function PartnerProfileTab({ partnerId, partnerName, legacyProfile }: Props) {
  const { canEdit, isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGeneratedSections, setAiGeneratedSections] = useState<Set<string>>(new Set());

  // Current profile
  const { data: currentProfile, isLoading } = useQuery({
    queryKey: ["partner-profile-current", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("partner_id", partnerId)
        .eq("is_current", true)
        .eq("status", "approved")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Draft profile (if exists)
  const { data: draftProfile } = useQuery({
    queryKey: ["partner-profile-draft", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_profiles")
        .select("*")
        .eq("partner_id", partnerId)
        .in("status", ["draft", "review"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  // Profile files
  const activeProfileId = editing ? draftProfile?.profile_id : currentProfile?.profile_id;
  const { data: profileFiles } = useQuery({
    queryKey: ["partner-profile-files", activeProfileId],
    queryFn: async () => {
      if (!activeProfileId) return [];
      const { data, error } = await supabase
        .from("partner_profile_files")
        .select("*")
        .eq("profile_id", activeProfileId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!activeProfileId,
  });

  // Version history
  const { data: history } = useQuery({
    queryKey: ["partner-profile-history", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_profiles")
        .select("profile_id, title, status, version_number, profile_date, created_at, updated_at, is_current")
        .eq("partner_id", partnerId)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: showHistory,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["partner-profile-current", partnerId] });
    qc.invalidateQueries({ queryKey: ["partner-profile-draft", partnerId] });
    qc.invalidateQueries({ queryKey: ["partner-profile-history", partnerId] });
  };

  // Create new draft
  const createDraft = useMutation({
    mutationFn: async () => {
      const base = currentProfile;
      const nextVersion = (base?.version_number || 0) + 1;
      const sectionData: Record<string, string | null> = {};
      for (const s of SECTIONS) {
        sectionData[s.key] = base ? (base as any)[s.key] : null;
      }
      const { data, error } = await supabase.from("partner_profiles").insert({
        partner_id: partnerId,
        title: `${partnerName} — Профайл v${nextVersion}`,
        status: "draft",
        version_number: nextVersion,
        profile_type: "manual",
        source_type: "manual",
        based_on_profile_id: base?.profile_id || null,
        created_by: user?.id || null,
        ...sectionData,
      }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      invalidateAll();
      const formData: Record<string, string> = {};
      for (const s of SECTIONS) {
        formData[s.key] = (data as any)[s.key] || "";
      }
      setForm(formData);
      setEditing(true);
      toast.success("Черновик создан");
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Save draft
  const saveDraft = useMutation({
    mutationFn: async () => {
      if (!draftProfile) throw new Error("Нет черновика");
      const { error } = await supabase.from("partner_profiles")
        .update({ ...form, updated_by: user?.id || null })
        .eq("profile_id", draftProfile.profile_id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setAiGeneratedSections(new Set()); toast.success("Черновик сохранён"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Send to review
  const sendToReview = useMutation({
    mutationFn: async () => {
      if (!draftProfile) throw new Error("Нет черновика");
      const { error } = await supabase.from("partner_profiles")
        .update({ ...form, status: "review", updated_by: user?.id || null })
        .eq("profile_id", draftProfile.profile_id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setEditing(false); toast.success("Отправлено на рассмотрение"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Approve
  const approve = useMutation({
    mutationFn: async () => {
      const profileToApprove = draftProfile;
      if (!profileToApprove) throw new Error("Нет профайла для утверждения");
      if (currentProfile) {
        await supabase.from("partner_profiles")
          .update({ is_current: false })
          .eq("profile_id", currentProfile.profile_id);
      }
      const { error } = await supabase.from("partner_profiles")
        .update({
          status: "approved",
          is_current: true,
          approved_by: user?.id || null,
          approved_at: new Date().toISOString(),
          profile_date: new Date().toISOString().split("T")[0],
        })
        .eq("profile_id", profileToApprove.profile_id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setEditing(false); toast.success("Профайл утверждён"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Archive
  const archiveProfile = useMutation({
    mutationFn: async () => {
      if (!currentProfile) return;
      const { error } = await supabase.from("partner_profiles")
        .update({ status: "archived", is_current: false })
        .eq("profile_id", currentProfile.profile_id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success("Профайл архивирован"); },
    onError: (e: any) => toast.error(e.message),
  });

  // Generate with AI
  const generateProfile = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke("generate-partner-profile", {
        body: { partner_id: partnerId },
      });
      if (error) throw new Error(error.message || "Ошибка генерации");
      if (data?.error) throw new Error(data.error);
      return data.profile;
    },
    onSuccess: (profile) => {
      invalidateAll();
      const formData: Record<string, string> = {};
      const aiSections = new Set<string>();
      for (const s of SECTIONS) {
        const val = (profile as any)[s.key] || "";
        formData[s.key] = val;
        if (val) aiSections.add(s.key);
      }
      setForm(formData);
      setAiGeneratedSections(aiSections);
      setEditing(true);
      setIsGenerating(false);
      toast.success("Профайл сгенерирован AI. Проверьте и отредактируйте черновик.");
    },
    onError: (e: any) => {
      setIsGenerating(false);
      toast.error(e.message);
    },
  });

  // Start editing existing draft
  const startEditing = () => {
    if (draftProfile) {
      const formData: Record<string, string> = {};
      for (const s of SECTIONS) {
        formData[s.key] = (draftProfile as any)[s.key] || "";
      }
      setForm(formData);
      setEditing(true);
    }
  };

  // Parse references
  const parseReferences = (profile: any): ReferenceItem[] => {
    if (!profile?.references_json) return [];
    try {
      const refs = typeof profile.references_json === "string"
        ? JSON.parse(profile.references_json)
        : profile.references_json;
      if (Array.isArray(refs)) return refs;
    } catch { /* ignore */ }
    return [];
  };

  if (isLoading) return <p className="text-muted-foreground py-4">Загрузка профайла...</p>;

  const displayProfile = currentProfile;
  const hasDraft = !!draftProfile;
  const hasLegacy = !currentProfile && !draftProfile && (legacyProfile?.company_profile || legacyProfile?.technology_profile || legacyProfile?.strategic_priorities);
  const references = displayProfile ? parseReferences(displayProfile) : [];
  const draftReferences = draftProfile ? parseReferences(draftProfile) : [];
  const activeReferences = editing ? draftReferences : references;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">Профайл компании</h2>
          <ProfileFreshnessBadge
            profile={displayProfile ? {
              status: displayProfile.status,
              is_current: displayProfile.is_current,
              updated_at: displayProfile.updated_at,
            } : null}
          />
          {hasDraft && !editing && (
            <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
              Есть черновик v{draftProfile!.version_number} ({statusLabels[draftProfile!.status] || draftProfile!.status})
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && !editing && !hasDraft && (
            <>
              <Button size="sm" onClick={() => createDraft.mutate()} disabled={createDraft.isPending || isGenerating}>
                <Plus className="mr-1 h-3.5 w-3.5" />
                {currentProfile ? "Новая версия" : "Создать профайл"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generateProfile.mutate()}
                disabled={generateProfile.isPending || isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3.5 w-3.5" />
                )}
                {isGenerating ? "Генерация..." : "Сгенерировать с AI"}
              </Button>
            </>
          )}
          {canEdit && !editing && hasDraft && (
            <Button size="sm" variant="outline" onClick={startEditing}>
              <Edit className="mr-1 h-3.5 w-3.5" />Редактировать черновик
            </Button>
          )}
          {isAdmin && hasDraft && draftProfile!.status === "review" && !editing && (
            <Button size="sm" onClick={() => approve.mutate()} disabled={approve.isPending}>
              <Check className="mr-1 h-3.5 w-3.5" />Утвердить
            </Button>
          )}
          {isAdmin && currentProfile && (
            <Button size="sm" variant="outline" onClick={() => archiveProfile.mutate()} disabled={archiveProfile.isPending}>
              <Archive className="mr-1 h-3.5 w-3.5" />Архивировать
            </Button>
          )}
          {displayProfile && !editing && (
            <ProfilePdfExport
              profile={displayProfile}
              partnerName={partnerName}
              references={activeReferences.length > 0 ? activeReferences : references}
            />
          )}
          <Button size="sm" variant="ghost" onClick={() => setShowHistory(!showHistory)}>
            <History className="mr-1 h-3.5 w-3.5" />История
          </Button>
        </div>
      </div>

      {/* Meta info */}
      {displayProfile && !editing && (
        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span>Версия: {displayProfile.version_number}</span>
          {displayProfile.profile_date && <span>Дата: {displayProfile.profile_date}</span>}
          <span>Обновлён: {new Date(displayProfile.updated_at).toLocaleDateString("ru")}</span>
        </div>
      )}

      {/* Edit mode */}
      {editing && draftProfile && (
        <div className="space-y-4">
          <h3 className="text-base font-semibold">Редактирование — v{draftProfile.version_number}</h3>
          {SECTIONS.map((s) => (
            <div key={s.key} className="space-y-1.5">
              <Label className="text-sm">{s.label}</Label>
              <Textarea
                value={form[s.key] || ""}
                onChange={(e) => {
                  setForm((prev) => ({ ...prev, [s.key]: e.target.value }));
                  setAiGeneratedSections((prev) => { const next = new Set(prev); next.delete(s.key); return next; });
                }}
                rows={s.key === "summary_short" ? 2 : 4}
                className={`font-mono text-xs ${aiGeneratedSections.has(s.key) ? "text-blue-600 border-blue-300" : ""}`}
              />
            </div>
          ))}

          {/* File upload in edit mode */}
          <ProfileFileUpload
            profileId={draftProfile.profile_id}
            partnerId={partnerId}
            files={(profileFiles as any) || []}
            editable
          />

          {/* References in edit mode (read-only) */}
          {draftReferences.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2" id="references">
              <h3 className="text-sm font-semibold">Источники</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {draftReferences.map((ref, i) => (
                  <li key={i} className="text-muted-foreground">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {ref.text || ref.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span>{ref.text}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={() => saveDraft.mutate()} disabled={saveDraft.isPending}>
              <Save className="mr-1 h-3.5 w-3.5" />Сохранить черновик
            </Button>
            <Button variant="secondary" onClick={() => sendToReview.mutate()} disabled={sendToReview.isPending}>
              <Send className="mr-1 h-3.5 w-3.5" />На рассмотрение
            </Button>
            <Button variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
          </div>
        </div>
      )}

      {/* View mode — current profile */}
      {!editing && displayProfile && (
        <>
          <Accordion type="multiple" defaultValue={["summary_short"]}>
            {SECTIONS.map((s) => {
              const val = (displayProfile as any)[s.key];
              if (!val) return null;
              return (
                <AccordionItem key={s.key} value={s.key}>
                  <AccordionTrigger className="text-sm font-medium">{s.label}</AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ href, children, ...props }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" {...props}>{children}</a>
                          ),
                          p: ({ children, ...props }) => {
                            if (typeof children === "string") {
                              const parts = children.split(/(\[\d+(?:,\s*\d+)*\])/g);
                              if (parts.length > 1) {
                                return (
                                  <p {...props}>
                                    {parts.map((part, i) => {
                                      const match = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
                                      if (match) {
                                        const nums = match[1].split(/,\s*/).map(n => n.trim());
                                        return (
                                          <span key={i}>
                                            [
                                            {nums.map((num, ni) => (
                                              <span key={ni}>
                                                {ni > 0 && ", "}
                                                <a
                                                  href="#references"
                                                  className="text-primary hover:underline text-xs align-super cursor-pointer"
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    document.getElementById("references")?.scrollIntoView({ behavior: "smooth" });
                                                  }}
                                                >
                                                  {num}
                                                </a>
                                              </span>
                                            ))}
                                            ]
                                          </span>
                                        );
                                      }
                                      return part;
                                    })}
                                  </p>
                                );
                              }
                            }
                            return <p {...props}>{children}</p>;
                          },
                          table: ({ children }: any) => (
                            <div className="overflow-x-auto my-2">
                              <table className="w-full text-sm border-collapse border border-border rounded">{children}</table>
                            </div>
                          ),
                          thead: ({ children }: any) => (
                            <thead className="bg-muted/50">{children}</thead>
                          ),
                          th: ({ children }: any) => (
                            <th className="border border-border px-3 py-2 text-left font-medium text-xs">{children}</th>
                          ),
                          td: ({ children }: any) => (
                            <td className="border border-border px-3 py-2 text-xs">{children}</td>
                          ),
                        }}
                      >
                        {val}
                      </ReactMarkdown>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          {/* References block */}
          {references.length > 0 && (
            <div className="border rounded-lg p-4 space-y-2" id="references">
              <h3 className="text-sm font-semibold">Источники</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {references.map((ref, i) => (
                  <li key={i} className="text-muted-foreground">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline inline-flex items-center gap-1"
                      >
                        {ref.text || ref.url}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span>{ref.text}</span>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Files */}
          {activeProfileId && (
            <ProfileFileUpload
              profileId={activeProfileId}
              partnerId={partnerId}
              files={(profileFiles as any) || []}
              editable={false}
            />
          )}
        </>
      )}

      {/* Fallback: legacy data */}
      {!editing && !displayProfile && hasLegacy && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base text-muted-foreground">Данные из карточки партнёра (legacy)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {legacyProfile?.company_profile && (
              <div>
                <span className="font-medium">Профиль компании:</span>
                <p className="whitespace-pre-wrap mt-1">{legacyProfile.company_profile}</p>
              </div>
            )}
            {legacyProfile?.technology_profile && (
              <div>
                <span className="font-medium">Технологический профиль:</span>
                <p className="whitespace-pre-wrap mt-1">{legacyProfile.technology_profile}</p>
              </div>
            )}
            {legacyProfile?.strategic_priorities && (
              <div>
                <span className="font-medium">Стратегические приоритеты:</span>
                <p className="whitespace-pre-wrap mt-1">{legacyProfile.strategic_priorities}</p>
              </div>
            )}
            {canEdit && (
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={() => createDraft.mutate()} disabled={createDraft.isPending}>
                  <Plus className="mr-1 h-3.5 w-3.5" />Создать профайл
                </Button>
                <Button size="sm" variant="outline" onClick={() => generateProfile.mutate()} disabled={generateProfile.isPending || isGenerating}>
                  {isGenerating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Sparkles className="mr-1 h-3.5 w-3.5" />}
                  {isGenerating ? "Генерация..." : "Сгенерировать с AI"}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No data at all */}
      {!editing && !displayProfile && !hasLegacy && (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Профайл ещё не создан</p>
          {canEdit && (
            <div className="flex gap-2 justify-center">
              <Button onClick={() => createDraft.mutate()} disabled={createDraft.isPending}>
                <Plus className="mr-1 h-4 w-4" />Создать профайл
              </Button>
              <Button variant="outline" onClick={() => generateProfile.mutate()} disabled={generateProfile.isPending || isGenerating}>
                {isGenerating ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1 h-4 w-4" />}
                {isGenerating ? "Генерация..." : "Сгенерировать с AI"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Version history */}
      {showHistory && history && (
        <Card>
          <CardHeader><CardTitle className="text-base">История версий</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Версия</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead>Текущий</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((h) => (
                  <TableRow key={h.profile_id}>
                    <TableCell className="font-medium">v{h.version_number}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{statusLabels[h.status] || h.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(h.created_at).toLocaleDateString("ru")}
                    </TableCell>
                    <TableCell>{h.is_current ? <Badge>Да</Badge> : "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
