import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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

const DEFAULT_SYSTEM_PROMPT = `Ты — аналитик по партнёрствам МИЭМ НИУ ВШЭ. Твоя задача — составить детальный аналитический профайл компании-партнёра.

Контекст МИЭМ:
МИЭМ — институт НИУ ВШЭ в области электроники, CS, прикладной математики. Форматы сотрудничества: R&D-проекты, проектное обучение, стажировки, совместные лаборатории, хакатоны.

ПРАВИЛА ФОРМАТИРОВАНИЯ:
- Пиши на русском языке
- Используй markdown: заголовки, таблицы, нумерованные и маркированные списки
- Каждый факт сопровождай ссылкой на источник в формате [N]
- В конце КАЖДОЙ секции добавь блок "Источники:" со списком использованных ссылок

ПРАВИЛА КАЧЕСТВА:
- Будь конкретен: цифры, даты, названия продуктов, процентные доли
- НЕ ПОВТОРЯЙ факты между секциями — каждый факт упоминается только один раз
- Если данных недостаточно — пиши "Данные не найдены", НЕ выдумывай
- Избегай общих слов и клише ("динамично развивающаяся компания", "широкий спектр")
- Для business_scale используй табличный формат
- НЕ ДАВАЙ рекомендаций, прогнозов или предложений по сотрудничеству с МИЭМ — профайл должен содержать только проверенные факты о компании

СТРУКТУРА ССЫЛОК:
В поле references верни массив всех источников: [{"number": 1, "text": "Название источника", "url": "https://..."}]`;

interface SectionConfig {
  key: string;
  title: string;
  prompt: string;
}

// Only these 8 keys correspond to actual partner_profiles columns
const ALLOWED_SECTION_KEYS = new Set([
  "summary_short", "company_overview", "business_scale", "technology_focus",
  "strategic_priorities", "relationship_with_other_universities",
  "recent_news_and_plans", "key_events_and_touchpoints",
]);

const DEFAULT_SECTIONS: SectionConfig[] = [
  { key: "summary_short", title: "Краткое описание", prompt: "Напиши 2-3 предложения: основная деятельность, масштаб (выручка/сотрудники), уникальное ценностное предложение. Не повторяй информацию из других секций. Каждый факт — со ссылкой [N]." },
  { key: "company_overview", title: "Общие сведения о компании", prompt: "История создания (год, основатели), миссия, основная деятельность, ключевые продукты/услуги. Укажи организационную структуру если известна. Факты со ссылками [N]." },
  { key: "business_scale", title: "Масштаб и показатели", prompt: "ОБЯЗАТЕЛЬНО используй формат таблицы:\n| Показатель | Значение | Источник |\n|---|---|---|\n\nВключи: выручка (в динамике за 3+ лет если есть), количество сотрудников, география присутствия, доля рынка, рейтинги. Укажи структуру бизнеса по сегментам с процентами. Если точных данных нет — \"Данные не найдены\"." },
  { key: "technology_focus", title: "Технологический и продуктовый фокус", prompt: "Перечисли конкретные технологии, платформы, продукты с названиями и версиями. Группируй по направлениям. Укажи технологический стек, используемые языки/фреймворки, собственные разработки vs лицензированные. Ссылки [N]." },
  { key: "strategic_priorities", title: "Стратегические направления", prompt: "Выдели 3-5 ключевых стратегических направлений. Для каждого укажи: конкретные шаги, сроки, инвестиции если известны. Отдельно выдели направления, релевантные для академического партнёрства. Ссылки [N]." },
  { key: "relationship_with_other_universities", title: "Взаимодействие с другими университетами", prompt: "Перечисли конкретные университеты-партнёры, форматы (лаборатории, кафедры, гранты, стипендии), даты начала. Укажи масштаб программ. Это важно для понимания конкурентного ландшафта. Ссылки [N]." },
  { key: "recent_news_and_plans", title: "Последние новости и планы", prompt: "Только за последние 12-18 месяцев. Структурируй хронологически. Укажи: дата, суть новости, влияние на бизнес. Выдели новости, релевантные для академического сотрудничества. Ссылки [N]." },
  { key: "key_events_and_touchpoints", title: "Ключевые мероприятия", prompt: "Только подтверждённые прошедшие мероприятия с датами и местами проведения. Укажи: название, дату, место, масштаб. НЕ пиши рекомендации, прогнозы или предложения для МИЭМ — только факты. Ссылки [N]." },
];

export default function AdminAISettings() {
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [sections, setSections] = useState<SectionConfig[]>(DEFAULT_SECTIONS);
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
      .in("key", ["ai_profile_model", "ai_profile_system_prompt", "ai_profile_sections"]);

    if (data) {
      for (const row of data) {
        const val = row.value as Record<string, any>;
        if (row.key === "ai_profile_model" && val.model) setModel(val.model);
        if (row.key === "ai_profile_system_prompt" && val.prompt) setSystemPrompt(val.prompt);
        if (row.key === "ai_profile_sections" && Array.isArray(val.sections)) {
          setSections(val.sections);
        }
      }
    }
    setLoading(false);
  }

  function updateSectionPrompt(key: string, newPrompt: string) {
    setSections(prev => prev.map(s => s.key === key ? { ...s, prompt: newPrompt } : s));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const upserts = [
        supabase.from("app_settings").upsert({ key: "ai_profile_model", value: { model } as any, updated_at: now }, { onConflict: "key" }),
        supabase.from("app_settings").upsert({ key: "ai_profile_system_prompt", value: { prompt: systemPrompt } as any, updated_at: now }, { onConflict: "key" }),
        supabase.from("app_settings").upsert({ key: "ai_profile_sections", value: { sections } as any, updated_at: now }, { onConflict: "key" }),
      ];
      const results = await Promise.all(upserts);
      const err = results.find(r => r.error)?.error;
      if (err) throw err;
      toast.success("Настройки AI сохранены");
    } catch (e: any) {
      toast.error(e.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setModel(DEFAULT_MODEL);
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    setSections(DEFAULT_SECTIONS);
    toast.info("Настройки сброшены к значениям по умолчанию. Не забудьте сохранить.");
  }

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6 mt-4">
      {/* Model */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Модель</CardTitle>
          <CardDescription>AI-модель для генерации профайлов</CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* System Prompt */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Системный промт</CardTitle>
          <CardDescription>Общие инструкции: контекст МИЭМ, правила форматирования, требования к ссылкам и качеству</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-2">
            <Label>Промт</Label>
            <span className="text-xs text-muted-foreground">{systemPrompt.length} символов</span>
          </div>
          <Textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={12}
            className="font-mono text-xs leading-relaxed"
          />
        </CardContent>
      </Card>

      {/* Section Prompts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Схема секций профайла</CardTitle>
          <CardDescription>Индивидуальный промт для каждой из 13 секций. Определяет формат и содержание каждого раздела.</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {sections.map((section, idx) => (
              <AccordionItem key={section.key} value={section.key}>
                <AccordionTrigger className="text-sm hover:no-underline">
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-mono w-5 text-right">{idx + 1}.</span>
                    <span>{section.title}</span>
                    <span className="text-xs text-muted-foreground font-mono">({section.key})</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pt-2">
                    <div className="flex items-center justify-between mb-1">
                      <Label className="text-xs">Промт для секции</Label>
                      <span className="text-xs text-muted-foreground">{section.prompt.length} симв.</span>
                    </div>
                    <Textarea
                      value={section.prompt}
                      onChange={(e) => updateSectionPrompt(section.key, e.target.value)}
                      rows={5}
                      className="font-mono text-xs leading-relaxed"
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Сохранить всё
        </Button>
        <Button variant="outline" onClick={handleReset} className="gap-1.5">
          <RotateCcw className="h-4 w-4" />
          Сбросить к умолчанию
        </Button>
      </div>
    </div>
  );
}
