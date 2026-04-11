import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { MarkdownWysiwyg } from "./MarkdownWysiwyg";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { ProfileFreshnessBadge } from "./ProfileFreshnessBadge";
import { ProfileFileUpload } from "./ProfileFileUpload";
import { ProfilePdfExport } from "./ProfilePdfExport";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Plus, Edit, Send, Check, Archive, History, Save, Sparkles, Loader2, ExternalLink, CheckCircle2, Circle, AlertTriangle, XCircle, ShieldCheck } from "lucide-react";
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

const statusLabels: Record<string, string> = {
  draft: "Черновик", review: "На рассмотрении", approved: "Утверждён", archived: "Архив",
};

interface ReferenceItem {
  number: number;
  text: string;
  url?: string;
}

interface FactCheck {
  fact: string;
  source_ref: number;
  status: "confirmed" | "unconfirmed" | "contradicted";
  explanation?: string;
}

interface SectionVerification {
  section_key: string;
  facts: FactCheck[];
  confirmed: number;
  unconfirmed: number;
  contradicted: number;
}

interface VerificationSummary {
  confirmed: number;
  unconfirmed: number;
  contradicted: number;
}

interface Props {
  partnerId: string;
  partnerName: string;
  legacyProfile?: { company_profile?: string; technology_profile?: string; strategic_priorities?: string };
}

// Shared markdown components for both view and edit preview
const makeMarkdownComponents = () => ({
  a: ({ href, children, ...props }: any) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" {...props}>{children}</a>
  ),
  p: ({ children, ...props }: any) => {
    if (typeof children === "string") {
      const parts = children.split(/(\[\d+(?:,\s*\d+)*\])/g);
      if (parts.length > 1) {
        return (
          <p {...props}>
            {parts.map((part: string, i: number) => {
              const match = part.match(/^\[(\d+(?:,\s*\d+)*)\]$/);
              if (match) {
                const nums = match[1].split(/,\s*/).map((n: string) => n.trim());
                return (
                  <span key={i}>
                    [
                    {nums.map((num: string, ni: number) => (
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
});

const markdownComponents = makeMarkdownComponents();

function VerificationBadge({ verification }: { verification?: SectionVerification }) {
  if (!verification) return null;
  const total = verification.confirmed + verification.unconfirmed + verification.contradicted;
  if (total === 0) return null;

  if (verification.contradicted > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 gap-0.5">
              <XCircle className="h-3 w-3" />
              {verification.contradicted}❌
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">✅ {verification.confirmed} подтв. ⚠️ {verification.unconfirmed} не подтв. ❌ {verification.contradicted} противореч.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (verification.unconfirmed > 0) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 bg-yellow-100 text-yellow-800">
              <AlertTriangle className="h-3 w-3" />
              {verification.unconfirmed} не подтв.
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="text-xs">✅ {verification.confirmed} подтв. ⚠️ {verification.unconfirmed} не подтв.</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-0.5 bg-green-100 text-green-800">
            <ShieldCheck className="h-3 w-3" />
            {verification.confirmed}/{total}
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Все {total} фактов подтверждены источниками</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function VerificationDetails({ verification }: { verification: SectionVerification }) {
  const [expanded, setExpanded] = useState(false);
  if (verification.facts.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
        onClick={() => setExpanded(!expanded)}
      >
        <ShieldCheck className="h-3 w-3" />
        {expanded ? "Скрыть проверку фактов" : "Показать проверку фактов"}
      </button>
      {expanded && (
        <div className="mt-2 space-y-1 border rounded-md p-2 bg-muted/30">
          {verification.facts.map((f, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <span className="shrink-0 mt-0.5">
                {f.status === "confirmed" ? "✅" : f.status === "contradicted" ? "❌" : "⚠️"}
              </span>
              <div>
                <span className={f.status === "unconfirmed" ? "text-yellow-700" : f.status === "contradicted" ? "text-destructive" : "text-muted-foreground"}>
                  {f.fact}
                </span>
                {f.source_ref > 0 && <span className="text-primary ml-1">[{f.source_ref}]</span>}
                {f.explanation && <span className="text-muted-foreground ml-1">— {f.explanation}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function VerificationSummaryBanner({ summary, sourcesCount }: { summary: VerificationSummary; sourcesCount: number }) {
  const total = summary.confirmed + summary.unconfirmed + summary.contradicted;
  if (total === 0) return null;

  const pct = Math.round((summary.confirmed / total) * 100);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30 text-sm">
      <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium">Факт-чекинг:</span>
          <span className="text-green-700">✅ {summary.confirmed}</span>
          {summary.unconfirmed > 0 && <span className="text-yellow-700">⚠️ {summary.unconfirmed}</span>}
          {summary.contradicted > 0 && <span className="text-destructive">❌ {summary.contradicted}</span>}
          <span className="text-muted-foreground">({pct}% подтверждено)</span>
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          Проверено по {sourcesCount} источникам (сайт, веб-поиск, загруженные файлы)
        </p>
      </div>
    </div>
  );
}

function ReferencesBlock({ references, sticky }: { references: ReferenceItem[]; sticky?: boolean }) {
  if (references.length === 0) return null;
  return (
    <div className={`border rounded-lg p-4 space-y-2 ${sticky ? "lg:sticky lg:top-4" : ""}`} id="references">
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
  );
}

export function PartnerProfileTab({ partnerId, partnerName, legacyProfile }: Props) {
  const { canEdit, isAdmin, user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [regeneratingSection, setRegeneratingSection] = useState<string | null>(null);
  const [aiGeneratedSections, setAiGeneratedSections] = useState<Set<string>>(new Set());
  const [verificationData, setVerificationData] = useState<SectionVerification[]>([]);

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

  // Extract verification from profile's generated_from_sources_json
  const getStoredVerification = (profile: any): { verification: SectionVerification[]; summary: VerificationSummary | null; sourcesCount: number } => {
    try {
      const sources = profile?.generated_from_sources_json;
      if (!sources) return { verification: [], summary: null, sourcesCount: 0 };
      const parsed = typeof sources === "string" ? JSON.parse(sources) : sources;
      return {
        verification: parsed.verification || [],
        summary: parsed.verification_summary || null,
        sourcesCount: parsed.total_sources || 0,
      };
    } catch {
      return { verification: [], summary: null, sourcesCount: 0 };
    }
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

  // Generate with AI (full profile)
  const generateProfile = useMutation({
    mutationFn: async () => {
      setIsGenerating(true);
      const { data, error } = await supabase.functions.invoke("generate-partner-profile", {
        body: { partner_id: partnerId },
      });
      if (error) throw new Error(error.message || "Ошибка генерации");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      invalidateAll();
      const profile = data.profile;
      const formData: Record<string, string> = {};
      const aiSections = new Set<string>();
      for (const s of SECTIONS) {
        const val = (profile as any)[s.key] || "";
        formData[s.key] = val;
        if (val) aiSections.add(s.key);
      }
      setForm(formData);
      setAiGeneratedSections(aiSections);
      if (data.verification) {
        setVerificationData(data.verification);
      }
      setEditing(true);
      setIsGenerating(false);
      toast.success("Профайл сгенерирован AI. Проверьте и отредактируйте черновик.");
    },
    onError: (e: any) => {
      setIsGenerating(false);
      toast.error(e.message);
    },
  });

  // Regenerate single section
  const regenerateSection = async (sectionKey: string) => {
    if (!draftProfile) return;
    setRegeneratingSection(sectionKey);
    try {
      const { data, error } = await supabase.functions.invoke("generate-partner-profile", {
        body: { partner_id: partnerId, section_key: sectionKey, profile_id: draftProfile.profile_id },
      });
      if (error) throw new Error(error.message || "Ошибка генерации");
      if (data?.error) throw new Error(data.error);
      const newVal = data.section_content || "";
      setForm((prev) => ({ ...prev, [sectionKey]: newVal }));
      setAiGeneratedSections((prev) => new Set(prev).add(sectionKey));
      if (data.references) {
        invalidateAll();
      }
      toast.success("Секция перегенерирована");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRegeneratingSection(null);
    }
  };

  // Start editing existing draft
  const startEditing = () => {
    if (draftProfile) {
      const formData: Record<string, string> = {};
      for (const s of SECTIONS) {
        formData[s.key] = (draftProfile as any)[s.key] || "";
      }
      setForm(formData);
      setEditing(true);
      // Load stored verification if available
      const { verification } = getStoredVerification(draftProfile);
      if (verification.length > 0) setVerificationData(verification);
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

  // Verification from stored profile or live data
  const storedVerification = getStoredVerification(editing ? draftProfile : displayProfile);
  const activeVerification = verificationData.length > 0 ? verificationData : storedVerification.verification;
  const activeSummary = verificationData.length > 0
    ? { confirmed: verificationData.reduce((s, v) => s + v.confirmed, 0), unconfirmed: verificationData.reduce((s, v) => s + v.unconfirmed, 0), contradicted: verificationData.reduce((s, v) => s + v.contradicted, 0) }
    : storedVerification.summary;
  const sourcesCount = storedVerification.sourcesCount;

  const getVerificationForSection = (key: string): SectionVerification | undefined => {
    return activeVerification.find(v => v.section_key === key);
  };

  // Progress
  const filledCount = SECTIONS.filter((s) => (form[s.key] || "").trim().length > 0).length;
  const progressPercent = Math.round((filledCount / SECTIONS.length) * 100);

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

      {/* Verification summary banner */}
      {activeSummary && (activeSummary.confirmed + activeSummary.unconfirmed + activeSummary.contradicted) > 0 && (
        <VerificationSummaryBanner summary={activeSummary} sourcesCount={sourcesCount} />
      )}

      {/* Edit mode */}
      {editing && draftProfile && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold">Редактирование — v{draftProfile.version_number}</h3>
            <span className="text-sm text-muted-foreground">{filledCount}/{SECTIONS.length} секций</span>
            <Progress value={progressPercent} className="w-32 h-2" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
            {/* Sections accordion with split-view */}
            <div>
              <Accordion type="multiple" defaultValue={[SECTIONS[0].key]}>
                {SECTIONS.map((s) => {
                  const isFilled = (form[s.key] || "").trim().length > 0;
                  const isRegenerating = regeneratingSection === s.key;
                  const sectionVerification = getVerificationForSection(s.key);
                  return (
                    <AccordionItem key={s.key} value={s.key}>
                      <AccordionTrigger className="text-sm font-medium">
                        <span className="flex items-center gap-2">
                          {isFilled ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          {s.label}
                          {aiGeneratedSections.has(s.key) && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-100 text-blue-700">AI</Badge>
                          )}
                          <VerificationBadge verification={sectionVerification} />
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="flex items-center gap-2 mb-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs gap-1"
                            disabled={isRegenerating || !!regeneratingSection}
                            onClick={() => regenerateSection(s.key)}
                          >
                            {isRegenerating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Sparkles className="h-3 w-3" />
                            )}
                            {isRegenerating ? "Генерация..." : "Перегенерировать"}
                          </Button>
                        </div>
                        <MarkdownWysiwyg
                          value={form[s.key] || ""}
                          onChange={(md) => {
                            setForm((prev) => ({ ...prev, [s.key]: md }));
                            setAiGeneratedSections((prev) => { const next = new Set(prev); next.delete(s.key); return next; });
                          }}
                          className={aiGeneratedSections.has(s.key) ? "border-blue-300" : ""}
                          minHeight={s.key === "summary_short" ? "120px" : "200px"}
                        />
                        {sectionVerification && <VerificationDetails verification={sectionVerification} />}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {/* File upload in edit mode */}
              <div className="mt-4">
                <ProfileFileUpload
                  profileId={draftProfile.profile_id}
                  partnerId={partnerId}
                  files={(profileFiles as any) || []}
                  editable
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-4">
                <Button onClick={() => saveDraft.mutate()} disabled={saveDraft.isPending}>
                  <Save className="mr-1 h-3.5 w-3.5" />Сохранить черновик
                </Button>
                <Button variant="secondary" onClick={() => sendToReview.mutate()} disabled={sendToReview.isPending}>
                  <Send className="mr-1 h-3.5 w-3.5" />На рассмотрение
                </Button>
                <Button variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
              </div>
            </div>

            {/* Sticky references sidebar */}
            <aside className="hidden lg:block">
              <ReferencesBlock references={draftReferences} sticky />
            </aside>
          </div>

          {/* References on mobile (below sections) */}
          <div className="lg:hidden">
            <ReferencesBlock references={draftReferences} />
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
              const sectionVerification = getVerificationForSection(s.key);
              return (
                <AccordionItem key={s.key} value={s.key}>
                  <AccordionTrigger className="text-sm font-medium">
                    <span className="flex items-center gap-2">
                      {s.label}
                      <VerificationBadge verification={sectionVerification} />
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {val}
                      </ReactMarkdown>
                    </div>
                    {sectionVerification && <VerificationDetails verification={sectionVerification} />}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <ReferencesBlock references={references} />

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
