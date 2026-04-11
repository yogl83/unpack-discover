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

СТРУКТУРА ССЫЛОК:
В поле references верни массив всех источников: [{"number": 1, "text": "Название источника", "url": "https://..."}]`;

interface SectionConfig {
  key: string;
  title: string;
  prompt: string;
}

const DEFAULT_SECTIONS: SectionConfig[] = [
  { key: "summary_short", title: "Краткое описание", prompt: "Напиши 2-3 предложения." },
  { key: "company_overview", title: "Общие сведения о компании", prompt: "История, миссия, основная деятельность." },
  { key: "business_scale", title: "Масштаб и показатели", prompt: "Табличный формат." },
  { key: "technology_focus", title: "Технологический фокус", prompt: "Конкретные технологии и продукты." },
  { key: "strategic_priorities", title: "Стратегические направления", prompt: "3-5 направлений." },
  { key: "relationship_with_other_universities", title: "Другие университеты", prompt: "Конкретные вузы-партнёры." },
  { key: "recent_news_and_plans", title: "Новости и планы", prompt: "За последние 12-18 месяцев." },
  { key: "key_events_and_touchpoints", title: "Мероприятия", prompt: "Конференции, хакатоны." },
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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { partner_id } = await req.json();
    if (!partner_id) {
      return new Response(JSON.stringify({ error: "partner_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate auth
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Create user client to verify auth
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader! } },
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service client for DB operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Load AI settings from DB
    const { model: aiModel, systemPrompt, sections } = await loadAISettings(supabase);
    console.log("Using model:", aiModel, "sections:", sections.length);

    // Load partner data
    const { data: partner, error: partnerError } = await supabase
      .from("partners")
      .select("*")
      .eq("partner_id", partner_id)
      .single();

    if (partnerError || !partner) {
      return new Response(JSON.stringify({ error: "Partner not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get current max version
    const { data: maxVersionRow } = await supabase
      .from("partner_profiles")
      .select("version_number")
      .eq("partner_id", partner_id)
      .order("version_number", { ascending: false })
      .limit(1)
      .maybeSingle();
    const nextVersion = (maxVersionRow?.version_number || 0) + 1;

    // Step 1: Scrape website if available
    let websiteContent = "";
    let scrapedUrl = "";
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (partner.website_url && firecrawlKey) {
      try {
        let url = partner.website_url.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }
        scrapedUrl = url;
        console.log("Scraping:", url);
        const scrapeRes = await fetch("https://api.firecrawl.dev/v1/scrape", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${firecrawlKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url,
            formats: ["markdown"],
            onlyMainContent: true,
          }),
        });
        const scrapeData = await scrapeRes.json();
        if (scrapeRes.ok && scrapeData.success !== false) {
          const md = scrapeData.data?.markdown || scrapeData.markdown || "";
          websiteContent = md.slice(0, 30000);
          console.log(`Scraped ${websiteContent.length} chars`);
        } else {
          console.warn("Scrape failed:", JSON.stringify(scrapeData).slice(0, 500));
        }
      } catch (e) {
        console.warn("Scrape error:", e);
      }
    }

    // Step 2: Build composite system prompt from sections
    const sectionInstructions = sections.map((s, i) =>
      `${i + 1}. ${s.key} — «${s.title}»\nИнструкция: ${s.prompt}`
    ).join("\n\n");

    const compositeSystemPrompt = `${systemPrompt}

--- ИНСТРУКЦИИ ПО СЕКЦИЯМ ---

${sectionInstructions}`;

    // Build user prompt
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

    let userPrompt = `Данные из карточки партнёра:\n${cardInfo}`;
    if (websiteContent) {
      userPrompt += `\n\n--- СОДЕРЖИМОЕ САЙТА КОМПАНИИ ---\n${websiteContent}`;
    }
    userPrompt += `\n\nЗаполни все ${sections.length} секций профайла и список источников (references), вызвав функцию fill_profile.`;

    // Step 3: Build tool schema from sections
    const sectionProperties: Record<string, { type: string; description: string }> = {};
    for (const s of sections) {
      sectionProperties[s.key] = { type: "string", description: `${s.title}: ${s.prompt}` };
    }
    // Add references field
    sectionProperties["references"] = {
      type: "string",
      description: "JSON-массив источников в формате: [{\"number\": 1, \"text\": \"Название\", \"url\": \"https://...\"}]. Включи ВСЕ источники, на которые ссылаешься через [N].",
    };

    const requiredKeys = [...sections.map(s => s.key), "references"];

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Calling AI...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: compositeSystemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "fill_profile",
              description: "Заполняет все секции профайла партнёра и список источников",
              parameters: {
                type: "object",
                properties: sectionProperties,
                required: requiredKeys,
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "fill_profile" } },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      console.error("AI error:", aiRes.status, errText);
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Превышен лимит запросов к AI. Попробуйте позже." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Недостаточно кредитов AI. Пополните баланс." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI generation failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData).slice(0, 1000));
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse tool call args:", toolCall.function.arguments.slice(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("AI sections received:", Object.keys(parsed).length);

    // Parse references
    let references: any[] = [];
    try {
      if (parsed.references) {
        references = JSON.parse(parsed.references);
        if (!Array.isArray(references)) references = [];
      }
    } catch {
      // If references is already text, try to keep it
      console.warn("Could not parse references as JSON array");
    }
    // Add scraped URL as source if used
    if (scrapedUrl && !references.some((r: any) => r.url === scrapedUrl)) {
      references.unshift({ number: 0, text: "Сайт компании", url: scrapedUrl });
      // Re-number
      references = references.map((r: any, i: number) => ({ ...r, number: i + 1 }));
    }

    // Step 4: Save as draft
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
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Profile created:", profile.profile_id);
    return new Response(JSON.stringify({ success: true, profile }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
