import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, RotateCcw, Save } from "lucide-react";

const AVAILABLE_MODELS = [
  { value: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (preview)" },
  { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro" },
  { value: "google/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "openai/gpt-5-mini", label: "GPT-5 Mini" },
  { value: "openai/gpt-5", label: "GPT-5" },
];

const DEFAULT_MODEL = "google/gemini-3-flash-preview";

const DEFAULT_PROMPT = `Ты — аналитик по партнёрствам МИЭМ НИУ ВШЭ (Московский институт электроники и математики, часть Высшей школы экономики).

МИЭМ — ведущий российский институт в области электроники, компьютерных наук, прикладной математики и информатики. МИЭМ предлагает партнёрам:
- Совместные R&D-проекты и прикладные исследования
- Проектное обучение (студенческие команды решают реальные задачи бизнеса)
- Стажировки, практики и целевой набор кадров
- Экспертные консультации и совместные лаборатории
- Хакатоны, митапы и совместные мероприятия

Твоя задача — на основе информации о компании заполнить 13 секций профайла партнёра. Пиши на русском языке. Будь конкретен, опирайся на факты. Если информации недостаточно — укажи "Данные не найдены" для этой секции.

Описание секций:
1. summary_short — Краткое описание компании (2-3 предложения)
2. company_overview — Общие сведения: история, миссия, основная деятельность
3. business_scale — Масштаб: выручка, количество сотрудников, офисы, рыночная позиция
4. technology_focus — Технологический и продуктовый фокус: ключевые технологии, продукты, платформы
5. strategic_priorities — Стратегические направления развития компании
6. talent_needs — Кадровые потребности: востребованные специальности, навыки, программы найма
7. collaboration_opportunities — Потенциальный запрос к МИЭМ: какие форматы сотрудничества могут быть интересны
8. current_relationship_with_miem — Текущее взаимодействие с МИЭМ (если есть информация)
9. relationship_with_other_universities — Взаимодействие с другими университетами
10. recent_news_and_plans — Последние новости и планы развития
11. key_events_and_touchpoints — Ключевые мероприятия компании (конференции, хакатоны и т.д.)
12. risks_and_constraints — Риски и ограничения для сотрудничества
13. recommended_next_steps — Рекомендуемые следующие шаги для установления партнёрства`;

export default function AdminAISettings() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["ai_profile_model", "ai_profile_prompt"]);

    if (data) {
      for (const row of data) {
        const val = row.value as Record<string, string>;
        if (row.key === "ai_profile_model" && val.model) setModel(val.model);
        if (row.key === "ai_profile_prompt" && val.prompt) setPrompt(val.prompt);
      }
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error: e1 } = await supabase
        .from("app_settings")
        .upsert({ key: "ai_profile_model", value: { model } as any, updated_at: new Date().toISOString() }, { onConflict: "key" });
      const { error: e2 } = await supabase
        .from("app_settings")
        .upsert({ key: "ai_profile_prompt", value: { prompt } as any, updated_at: new Date().toISOString() }, { onConflict: "key" });

      if (e1 || e2) throw e1 || e2;
      toast.success("Настройки AI сохранены");
    } catch (e: any) {
      toast.error(e.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setModel(DEFAULT_MODEL);
    setPrompt(DEFAULT_PROMPT);
    toast.info("Настройки сброшены к значениям по умолчанию. Не забудьте сохранить.");
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">AI-генерация профайлов</CardTitle>
          <CardDescription>Модель и системный промт для генерации профайлов партнёров</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Модель</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Системный промт</Label>
              <span className="text-xs text-muted-foreground">{prompt.length} символов</span>
            </div>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={16}
              className="font-mono text-xs leading-relaxed"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Сохранить
            </Button>
            <Button variant="outline" onClick={handleReset} className="gap-1.5">
              <RotateCcw className="h-4 w-4" />
              Сбросить к умолчанию
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
