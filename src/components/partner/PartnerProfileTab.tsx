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
import { Plus, Edit, Send, Check, Archive, History, Save, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SECTIONS = [
  { key: "summary_short", label: "Краткое описание" },
  { key: "company_overview", label: "Общие сведения о компании" },
  { key: "business_scale", label: "Масштаб и показатели деятельности" },
  { key: "technology_focus", label: "Технологический и продуктовый фокус" },
  { key: "strategic_priorities", label: "Стратегические направления" },
  { key: "talent_needs", label: "Кадровые потребности" },
  { key: "collaboration_opportunities", label: "Потенциальный запрос к МИЭМ" },
  { key: "current_relationship_with_miem", label: "Текущее взаимодействие с МИЭМ" },
  { key: "relationship_with_other_universities", label: "Взаимодействие с другими университетами" },
  { key: "recent_news_and_plans", label: "Последние новости и планы развития" },
  { key: "key_events_and_touchpoints", label: "Ключевые мероприятия" },
  { key: "risks_and_constraints", label: "Риски и ограничения" },
  { key: "recommended_next_steps", label: "Рекомендуемые шаги" },
] as const;

type SectionKey = typeof SECTIONS[number]["key"];

const statusLabels: Record<string, string> = {
  draft: "Черновик", review: "На рассмотрении", approved: "Утверждён", archived: "Архив",
};

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
    onSuccess: () => { invalidateAll(); toast.success("Черновик сохранён"); },
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
      // Unset current from old profile
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

  if (isLoading) return <p className="text-muted-foreground py-4">Загрузка профайла...</p>;

  const displayProfile = currentProfile;
  const hasDraft = !!draftProfile;
  const hasLegacy = !currentProfile && !draftProfile && (legacyProfile?.company_profile || legacyProfile?.technology_profile || legacyProfile?.strategic_priorities);

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
            <Button size="sm" onClick={() => createDraft.mutate()} disabled={createDraft.isPending}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              {currentProfile ? "Новая версия" : "Создать профайл"}
            </Button>
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
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Редактирование — v{draftProfile.version_number}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {SECTIONS.map((s) => (
              <div key={s.key} className="space-y-1.5">
                <Label className="text-sm">{s.label}</Label>
                <Textarea
                  value={form[s.key] || ""}
                  onChange={(e) => setForm((prev) => ({ ...prev, [s.key]: e.target.value }))}
                  rows={s.key === "summary_short" ? 2 : 3}
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

            <div className="flex gap-2 pt-2">
              <Button onClick={() => saveDraft.mutate()} disabled={saveDraft.isPending}>
                <Save className="mr-1 h-3.5 w-3.5" />Сохранить черновик
              </Button>
              <Button variant="secondary" onClick={() => sendToReview.mutate()} disabled={sendToReview.isPending}>
                <Send className="mr-1 h-3.5 w-3.5" />На рассмотрение
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>Отмена</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View mode — current profile */}
      {!editing && displayProfile && (
        <>
          <Accordion type="multiple" defaultValue={SECTIONS.filter((s) => (displayProfile as any)[s.key]).map((s) => s.key)}>
            {SECTIONS.map((s) => {
              const val = (displayProfile as any)[s.key];
              if (!val) return null;
              return (
                <AccordionItem key={s.key} value={s.key}>
                  <AccordionTrigger className="text-sm font-medium">{s.label}</AccordionTrigger>
                  <AccordionContent>
                    <p className="whitespace-pre-wrap text-sm">{val}</p>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

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
              <Button size="sm" className="mt-2" onClick={() => createDraft.mutate()} disabled={createDraft.isPending}>
                <Plus className="mr-1 h-3.5 w-3.5" />Создать профайл
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* No data at all */}
      {!editing && !displayProfile && !hasLegacy && (
        <div className="text-center py-8">
          <p className="text-muted-foreground mb-4">Профайл ещё не создан</p>
          {canEdit && (
            <Button onClick={() => createDraft.mutate()} disabled={createDraft.isPending}>
              <Plus className="mr-1 h-4 w-4" />Создать профайл
            </Button>
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
