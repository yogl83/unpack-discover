import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SECTION_KEYS = [
  "summary_short",
  "company_overview",
  "business_scale",
  "technology_focus",
  "strategic_priorities",
  "relationship_with_other_universities",
  "recent_news_and_plans",
  "key_events_and_touchpoints",
] as const;

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
- Для strategic_priorities — обосновывай направления конкретными фактами о компании
- НЕ ДАВАЙ рекомендаций, прогнозов или предложений по сотрудничеству с МИЭМ — профайл должен содержать только проверенные факты о компании

СТРУКТУРА ССЫЛОК:
В поле references верни массив всех источников: [{"number": 1, "text": "Название источника", "url": "https://..."}]`;

interface SectionConfig {
  key: string;
  title: string;
  prompt: string;
}

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

async function loadAISettings(supabase: ReturnType<typeof createClient>) {
  let model = DEFAULT_MODEL;
  let systemPrompt = DEFAULT_SYSTEM_PROMPT;
  let sections: SectionConfig[] = DEFAULT_SECTIONS;

  try {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["ai_profile_model", "ai_profile_system_prompt", "ai_profile_sections"]);

    if (data) {
      for (const row of data) {
        const val = row.value as Record<string, any>;
        if (row.key === "ai_profile_model" && val.model) model = val.model;
        if (row.key === "ai_profile_system_prompt" && val.prompt) systemPrompt = val.prompt;
        if (row.key === "ai_profile_sections" && Array.isArray(val.sections)) {
          sections = val.sections;
        }
      }
    }
  } catch (e) {
    console.warn("Failed to load AI settings, using defaults:", e);
  }

  return { model, systemPrompt, sections };
}

async function scrapeWebsite(websiteUrl: string, firecrawlKey: string): Promise<{ content: string; url: string }> {
  let url = websiteUrl.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  console.log("Scraping:", url);
  try {
    const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    });
    const scrapeData = await scrapeRes.json();
    if (scrapeRes.ok && scrapeData.success !== false) {
      const md = scrapeData.data?.markdown || scrapeData.markdown || "";
      const content = md.slice(0, 30000);
      console.log(`Scraped ${content.length} chars`);
      return { content, url };
    }
    console.warn("Scrape failed:", JSON.stringify(scrapeData).slice(0, 500));
  } catch (e) {
    console.warn("Scrape error:", e);
  }
  return { content: "", url };
}

function buildPartnerContext(partner: Record<string, any>, websiteContent: string): string {
  const cardInfo = [
    `Название: ${partner.partner_name}`,
    partner.legal_name ? `Юр. лицо: ${partner.legal_name}` : null,
    partner.industry ? `Отрасль: ${partner.industry}` : null,
    partner.subindustry ? `Подотрасль: ${partner.subindustry}` : null,
    partner.business_model ? `Бизнес-модель: ${partner.business_model}` : null,
    partner.city ? `Город: ${partner.city}` : null,
    partner.geography ? `География: ${partner.geography}` : null,
    partner.company_size ? `Размер: ${partner.company_size}` : null,
    partner.website_url ? `Сайт: ${partner.website_url}` : null,
    partner.company_profile ? `Профиль компании (legacy): ${partner.company_profile}` : null,
    partner.technology_profile ? `Технологический профиль (legacy): ${partner.technology_profile}` : null,
    partner.strategic_priorities ? `Стратегические приоритеты (legacy): ${partner.strategic_priorities}` : null,
  ].filter(Boolean).join("\n");

  let prompt = `Данные из карточки партнёра:\n${cardInfo}`;
  if (websiteContent) {
    prompt += `\n\n--- СОДЕРЖИМОЕ САЙТА КОМПАНИИ ---\n${websiteContent}`;
  }
  return prompt;
}

async function callAI(
  lovableKey: string,
  aiModel: string,
  systemPrompt: string,
  userPrompt: string,
  toolProperties: Record<string, { type: string; description: string }>,
  requiredKeys: string[],
) {
  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: aiModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "fill_profile",
            description: "Заполняет секции профайла партнёра и список источников",
            parameters: {
              type: "object",
              properties: toolProperties,
              required: requiredKeys,
              additionalProperties: false,
            },
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "fill_profile" } },
    }),
  });
  return aiRes;
}

function parseAIResponse(aiData: any): Record<string, string> | null {
  const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall?.function?.arguments) return null;
  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    return null;
  }
}

function parseReferencesFromResult(parsed: Record<string, string>, scrapedUrl: string): any[] {
  let references: any[] = [];
  try {
    if (parsed.references) {
      references = JSON.parse(parsed.references);
      if (!Array.isArray(references)) references = [];
    }
  } catch {
    console.warn("Could not parse references as JSON array");
  }
  if (scrapedUrl && !references.some((r: any) => r.url === scrapedUrl)) {
    references.unshift({ number: 0, text: "Сайт компании", url: scrapedUrl });
    references = references.map((r: any, i: number) => ({ ...r, number: i + 1 }));
  }
  return references;
}

function errorResponse(message: string, status: number) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { partner_id, section_key, profile_id } = body;
    if (!partner_id) return errorResponse("partner_id is required", 400);

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Unauthorized", 401);

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { model: aiModel, systemPrompt, sections } = await loadAISettings(supabase);

    // Load partner data
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("partner_id", partner_id)
      .single();
    if (partnerError || !partner) return errorResponse("Partner not found", 404);

    // Scrape website
    let websiteContent = "";
    let scrapedUrl = "";
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (partner.website_url && firecrawlKey) {
      const result = await scrapeWebsite(partner.website_url, firecrawlKey);
      websiteContent = result.content;
      scrapedUrl = result.url;
    }

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return errorResponse("LOVABLE_API_KEY not configured", 500);

    const partnerContext = buildPartnerContext(partner, websiteContent);

    // --- SINGLE SECTION REGENERATION ---
    if (section_key && profile_id) {
      const sectionConfig = sections.find((s) => s.key === section_key);
      if (!sectionConfig) return errorResponse(`Unknown section: ${section_key}`, 400);

      const singlePrompt = `${partnerContext}\n\nЗаполни ТОЛЬКО секцию "${sectionConfig.title}" (ключ: ${sectionConfig.key}). Инструкция: ${sectionConfig.prompt}\nТакже обнови список источников (references).`;

      const toolProps: Record<string, { type: string; description: string }> = {
        [section_key]: { type: "string", description: `${sectionConfig.title}: ${sectionConfig.prompt}` },
        references: {
          type: "string",
          description: "JSON-массив источников: [{\"number\": 1, \"text\": \"Название\", \"url\": \"https://...\"}]",
        },
      };

      console.log("Regenerating section:", section_key);
      const aiRes = await callAI(lovableKey, aiModel, systemPrompt, singlePrompt, toolProps, [section_key, "references"]);

      if (!aiRes.ok) {
        const status = aiRes.status;
        if (status === 429) return errorResponse("Превышен лимит запросов к AI. Попробуйте позже.", 429);
        if (status === 402) return errorResponse("Недостаточно кредитов AI.", 402);
        return errorResponse("AI generation failed", 500);
      }

      const aiData = await aiRes.json();
      const parsed = parseAIResponse(aiData);
      if (!parsed) return errorResponse("AI did not return structured data", 500);

      const sectionContent = parsed[section_key] || "";
      const references = parseReferencesFromResult(parsed, scrapedUrl);

      // Update the specific section in the existing profile
      const { error: updateError } = await supabase
        .from("partner_profiles")
        .update({
          [section_key]: sectionContent,
          references_json: references,
          updated_by: user.id,
          last_generated_at: new Date().toISOString(),
        })
        .eq("profile_id", profile_id);

      if (updateError) return errorResponse(updateError.message, 500);

      return new Response(JSON.stringify({ success: true, section_content: sectionContent, references }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- FULL PROFILE GENERATION ---
    const { data: maxVersionRow } = await supabase
      .from("partner_profiles")
      .select("version_number")
      .eq("partner_id", partner_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (maxVersionRow?.version_number || 0) + 1;

    const sectionInstructions = sections.map((s, i) =>
      `${i + 1}. ${s.key} — «${s.title}»\nИнструкция: ${s.prompt}`
    ).join("\n\n");

    const compositeSystemPrompt = `${systemPrompt}\n\n--- ИНСТРУКЦИИ ПО СЕКЦИЯМ ---\n\n${sectionInstructions}`;

    const userPrompt = `${partnerContext}\n\nЗаполни все ${sections.length} секций профайла и список источников (references), вызвав функцию fill_profile.`;

    const sectionProperties: Record<string, { type: string; description: string }> = {};
    for (const s of sections) {
      sectionProperties[s.key] = { type: "string", description: `${s.title}: ${s.prompt}` };
    }
    sectionProperties["references"] = {
      type: "string",
      description: "JSON-массив источников: [{\"number\": 1, \"text\": \"Название\", \"url\": \"https://...\"}].",
    };
    const requiredKeys = [...sections.map(s => s.key), "references"];

    console.log("Calling AI for full profile...");
    const aiRes = await callAI(lovableKey, aiModel, compositeSystemPrompt, userPrompt, sectionProperties, requiredKeys);

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) return errorResponse("Превышен лимит запросов к AI. Попробуйте позже.", 429);
      if (aiRes.status === 402) return errorResponse("Недостаточно кредитов AI. Пополните баланс.", 402);
      return errorResponse("AI generation failed", 500);
    }

    const aiData = await aiRes.json();
    const parsed = parseAIResponse(aiData);
    if (!parsed) {
      console.error("No tool call in response:", JSON.stringify(aiData).slice(0, 1000));
      return errorResponse("AI did not return structured data", 500);
    }
    console.log("AI sections received:", Object.keys(parsed).length);

    const references = parseReferencesFromResult(parsed, scrapedUrl);

    const profileData: Record<string, unknown> = {
      partner_id,
      title: `${partner.partner_name} — AI-профайл v${nextVersion}`,
      status: "draft",
      version_number: nextVersion,
      profile_type: "ai_generated",
      source_type: websiteContent ? "ai_web" : "ai_card",
      created_by: user.id,
      generation_status: "completed",
      last_generated_at: new Date().toISOString(),
      needs_human_review: true,
      references_json: references,
      generated_from_prompt: compositeSystemPrompt.slice(0, 10000),
      generated_from_sources_json: {
        website_url: partner.website_url || null,
        website_content_length: websiteContent.length,
        card_fields: Object.keys(partner).filter((k) => partner[k as keyof typeof partner]),
      },
    };
    for (const key of SECTION_KEYS) {
      profileData[key] = parsed[key] || null;
    }

    const { data: profile, error: insertError } = await supabase
      .from("partner_profiles")
      .insert(profileData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return errorResponse(insertError.message, 500);
    }

    console.log("Profile created:", profile.profile_id);
    return new Response(JSON.stringify({ success: true, profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
