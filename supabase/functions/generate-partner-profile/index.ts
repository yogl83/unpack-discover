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

ПРАВИЛА ССЫЛОК:
- Ссылайся ТОЛЬКО на источники из предоставленного списка с номерами [N]
- НЕ ВЫДУМЫВАЙ URL-адреса — используй только те, что даны в списке источников
- Если факт не подтверждён ни одним источником — НЕ включай его

СТРУКТУРА ССЫЛОК:
В поле references верни JSON-массив источников. Для КАЖДОГО источника укажи цитаты — дословные фрагменты из текста источника, подтверждающие факты в профайле:
[{"number": 1, "text": "Название источника", "url": "https://...", "quotes": [{"fact_text": "краткое описание факта в профайле", "source_quote": "дословная цитата из источника (1-2 предложения)"}]}]
Если из источника использовано несколько фактов — добавь несколько элементов в quotes. Если цитату найти не удалось — оставь quotes пустым массивом.`;

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

// ============ Source types ============
interface NumberedSource {
  number: number;
  type: "website" | "search" | "file" | "card";
  title: string;
  url?: string;
  content: string;
}

// ============ Verification types ============
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

// ============ Helpers ============

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

async function searchWeb(partnerName: string, firecrawlKey: string): Promise<{ title: string; url: string; content: string }[]> {
  const results: { title: string; url: string; content: string }[] = [];
  const queries = [
    `"${partnerName}" компания новости`,
    `"${partnerName}" технологии университет партнёрство`,
  ];

  for (const query of queries) {
    try {
      console.log("Web search:", query);
      const res = await fetch("https://api.firecrawl.dev/v1/search", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query,
          limit: 5,
          lang: "ru",
          country: "ru",
          scrapeOptions: { formats: ["markdown"] },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success !== false && Array.isArray(data.data)) {
        for (const item of data.data) {
          if (item.url && !results.some(r => r.url === item.url)) {
            results.push({
              title: item.title || item.url,
              url: item.url,
              content: (item.markdown || item.description || "").slice(0, 5000),
            });
          }
        }
      }
    } catch (e) {
      console.warn("Search error:", e);
    }
  }
  return results.slice(0, 8);
}

async function loadUploadedFiles(
  supabase: ReturnType<typeof createClient>,
  partnerId: string,
): Promise<{ filename: string; content: string }[]> {
  const files: { filename: string; content: string }[] = [];
  try {
    const { data: fileRecords } = await supabase
      .from("partner_profile_files")
      .select("file_id, original_filename, storage_path, storage_bucket, mime_type")
      .eq("partner_id", partnerId)
      .eq("is_source_document", true)
      .limit(5);

    if (!fileRecords || fileRecords.length === 0) return files;

    for (const file of fileRecords) {
      try {
        // Only process text-based files
        const mime = file.mime_type || "";
        const filename = file.original_filename || "";
        const isText = mime.startsWith("text/") || 
          mime === "application/json" ||
          filename.endsWith(".md") || filename.endsWith(".txt");
        
        if (!isText) {
          console.log(`Skipping non-text file: ${filename} (${mime})`);
          // Still note the file as a source even if we can't read it
          files.push({ filename, content: `[Файл загружен: ${filename}. Содержимое не извлечено — формат ${mime || "неизвестен"}.]` });
          continue;
        }

        const { data: fileData, error } = await supabase.storage
          .from(file.storage_bucket)
          .download(file.storage_path);

        if (error || !fileData) {
          console.warn(`Failed to download ${filename}:`, error);
          continue;
        }

        const text = await fileData.text();
        files.push({ filename, content: text.slice(0, 10000) });
        console.log(`Loaded file: ${filename} (${text.length} chars)`);
      } catch (e) {
        console.warn(`Error loading file ${file.original_filename}:`, e);
      }
    }
  } catch (e) {
    console.warn("Error loading uploaded files:", e);
  }
  return files;
}

function buildNumberedSources(
  partner: Record<string, any>,
  websiteResult: { content: string; url: string },
  searchResults: { title: string; url: string; content: string }[],
  uploadedFiles: { filename: string; content: string }[],
): NumberedSource[] {
  const sources: NumberedSource[] = [];
  let num = 1;

  // 1. Partner card data
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

  sources.push({ number: num++, type: "card", title: "Карточка партнёра в системе", content: cardInfo });

  // 2. Website scrape
  if (websiteResult.content) {
    sources.push({ number: num++, type: "website", title: "Сайт компании", url: websiteResult.url, content: websiteResult.content });
  }

  // 3. Web search results
  for (const sr of searchResults) {
    sources.push({ number: num++, type: "search", title: sr.title, url: sr.url, content: sr.content });
  }

  // 4. Uploaded files
  for (const uf of uploadedFiles) {
    sources.push({ number: num++, type: "file", title: `Загруженный файл: ${uf.filename}`, content: uf.content });
  }

  return sources;
}

function buildContextFromSources(sources: NumberedSource[]): string {
  const parts: string[] = [];
  parts.push("=== СПИСОК ИСТОЧНИКОВ ===\n");
  for (const s of sources) {
    parts.push(`--- ИСТОЧНИК [${s.number}]: ${s.title}${s.url ? ` (${s.url})` : ""} ---`);
    parts.push(s.content);
    parts.push("");
  }
  parts.push("=== КОНЕЦ СПИСКА ИСТОЧНИКОВ ===");
  return parts.join("\n");
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

function buildReferencesFromSources(sources: NumberedSource[]): any[] {
  return sources
    .filter(s => s.type !== "card") // don't list internal card as a URL reference
    .map(s => ({
      number: s.number,
      text: s.title,
      url: s.url || null,
    }));
}

async function runFactCheck(
  lovableKey: string,
  aiModel: string,
  sections: SectionConfig[],
  profileContent: Record<string, string>,
  sources: NumberedSource[],
): Promise<SectionVerification[]> {
  const sourceTexts = sources.map(s =>
    `[${s.number}] ${s.title}${s.url ? ` (${s.url})` : ""}:\n${s.content.slice(0, 3000)}`
  ).join("\n\n");

  const profileTexts = sections
    .filter(s => profileContent[s.key])
    .map(s => `### ${s.title} (${s.key}):\n${profileContent[s.key]}`)
    .join("\n\n");

  const verifyPrompt = `Ты — факт-чекер. Тебе дан сгенерированный профайл компании и исходные тексты источников.

Для каждой секции профайла:
1. Выдели все фактические утверждения (с ссылками [N])
2. Для каждого факта проверь, подтверждается ли он текстом указанного источника:
   - "confirmed" — факт найден в тексте источника
   - "unconfirmed" — факт НЕ найден в указанном источнике (возможная галлюцинация)
   - "contradicted" — факт противоречит данным источника

Верни JSON-массив по секциям.

=== ИСХОДНЫЕ ТЕКСТЫ ===
${sourceTexts}

=== ПРОФАЙЛ ===
${profileTexts}`;

  try {
    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: aiModel,
        messages: [
          { role: "system", content: "Ты — независимый факт-чекер. Проверяй каждый факт строго по тексту источника. Будь объективен." },
          { role: "user", content: verifyPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_verification",
            description: "Результаты проверки фактов по секциям",
            parameters: {
              type: "object",
              properties: {
                sections: {
                  type: "string",
                  description: `JSON-массив: [{"section_key": "...", "facts": [{"fact": "текст факта", "source_ref": N, "status": "confirmed|unconfirmed|contradicted", "explanation": "пояснение"}]}]`,
                },
              },
              required: ["sections"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_verification" } },
      }),
    });

    if (!res.ok) {
      console.warn("Fact-check AI call failed:", res.status);
      return [];
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) return [];

    const parsed = JSON.parse(toolCall.function.arguments);
    let sectionsData: any[] = [];
    
    if (typeof parsed.sections === "string") {
      sectionsData = JSON.parse(parsed.sections);
    } else if (Array.isArray(parsed.sections)) {
      sectionsData = parsed.sections;
    }

    return sectionsData.map((s: any) => {
      const facts: FactCheck[] = (s.facts || []).map((f: any) => ({
        fact: f.fact || "",
        source_ref: f.source_ref || 0,
        status: ["confirmed", "unconfirmed", "contradicted"].includes(f.status) ? f.status : "unconfirmed",
        explanation: f.explanation || undefined,
      }));
      return {
        section_key: s.section_key,
        facts,
        confirmed: facts.filter(f => f.status === "confirmed").length,
        unconfirmed: facts.filter(f => f.status === "unconfirmed").length,
        contradicted: facts.filter(f => f.status === "contradicted").length,
      };
    });
  } catch (e) {
    console.error("Fact-check error:", e);
    return [];
  }
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

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) return errorResponse("LOVABLE_API_KEY not configured", 500);

    // ============ GATHER ALL SOURCES ============
    // 1. Scrape website
    let websiteResult = { content: "", url: "" };
    if (partner.website_url && firecrawlKey) {
      websiteResult = await scrapeWebsite(partner.website_url, firecrawlKey);
    }

    // 2. Web search
    let searchResults: { title: string; url: string; content: string }[] = [];
    if (firecrawlKey) {
      searchResults = await searchWeb(partner.partner_name, firecrawlKey);
    }

    // 3. Uploaded files
    const uploadedFiles = await loadUploadedFiles(supabase, partner_id);

    // 4. Build numbered sources
    const numberedSources = buildNumberedSources(partner, websiteResult, searchResults, uploadedFiles);
    console.log(`Sources gathered: ${numberedSources.length} (website: ${websiteResult.content ? 1 : 0}, search: ${searchResults.length}, files: ${uploadedFiles.length})`);

    const sourceContext = buildContextFromSources(numberedSources);

    // --- SINGLE SECTION REGENERATION ---
    if (section_key && profile_id) {
      const { user_comment, fact_check_results, current_content } = body;
      const sectionConfig = sections.find((s) => s.key === section_key);
      if (!sectionConfig) return errorResponse(`Unknown section: ${section_key}`, 400);

      // Build enhanced prompt with strict fact-removal rules
      const promptParts: string[] = [
        sourceContext,
        `\n\nЗаполни ТОЛЬКО секцию "${sectionConfig.title}" (ключ: ${sectionConfig.key}). Инструкция: ${sectionConfig.prompt}`,
        `\n\nКРИТИЧЕСКОЕ ПРАВИЛО: Если факт нельзя подтвердить по источникам из списка — НЕ включай его в текст. Не перефразируй непроверенные факты в "мягкой" форме. Лучше написать "Данные не найдены", чем оставить неподтверждённый факт.`,
      ];

      if (current_content) {
        promptParts.push(`\n\n--- ТЕКУЩИЙ ТЕКСТ СЕКЦИИ ---\n${current_content}\n--- КОНЕЦ ТЕКУЩЕГО ТЕКСТА ---`);
      }

      if (fact_check_results && Array.isArray(fact_check_results) && fact_check_results.length > 0) {
        const issues = fact_check_results
          .filter((f: any) => f.status === "unconfirmed" || f.status === "contradicted")
          .map((f: any) => `${f.status === "contradicted" ? "❌ ПРОТИВОРЕЧИЕ" : "⚠️ НЕ ПОДТВЕРЖДЕНО"}: "${f.fact}"${f.explanation ? ` — ${f.explanation}` : ""}`)
          .join("\n");
        if (issues) {
          promptParts.push(`\n\n--- РЕЗУЛЬТАТЫ ПРОВЕРКИ ФАКТОВ ---\nСледующие факты ОБЯЗАТЕЛЬНО должны быть УДАЛЕНЫ из текста (не перефразированы, не смягчены — именно удалены):\n${issues}\n\nЕсли после удаления этих фактов секция остаётся пустой — напиши "Данные не найдены".\n--- КОНЕЦ РЕЗУЛЬТАТОВ ---`);
        }
      }

      if (user_comment && typeof user_comment === "string" && user_comment.trim()) {
        promptParts.push(`\n\n--- УКАЗАНИЯ АНАЛИТИКА (ПРИОРИТЕТНАЯ ИНСТРУКЦИЯ) ---\n${user_comment.trim()}\n--- КОНЕЦ УКАЗАНИЙ ---`);
      }

      promptParts.push(`\nИспользуй ТОЛЬКО источники из списка выше. Также обнови список источников (references).`);

      const singlePrompt = promptParts.join("");

      const toolProps: Record<string, { type: string; description: string }> = {
        [section_key]: { type: "string", description: `${sectionConfig.title}: ${sectionConfig.prompt}` },
        references: {
          type: "string",
          description: 'JSON-массив источников с цитатами: [{"number": 1, "text": "Название", "url": "https://...", "quotes": [{"fact_text": "факт из профайла", "source_quote": "дословная цитата из источника"}]}]',
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

      let sectionContent = parsed[section_key] || "";
      const references = buildReferencesFromSources(numberedSources);

      // ============ FACT-CHECK THE REGENERATED SECTION ============
      console.log("Running fact-check on regenerated section:", section_key);
      const sectionForCheck: Record<string, string> = { [section_key]: sectionContent };
      let sectionVerification = await runFactCheck(lovableKey, aiModel, [sectionConfig], sectionForCheck, numberedSources);

      // Check if there are still unconfirmed/contradicted facts
      const sv = sectionVerification.find(v => v.section_key === section_key);
      const badFacts = sv ? sv.unconfirmed + sv.contradicted : 0;

      // Track original counts before repair
      const originalCounts = sv ? { confirmed: sv.confirmed, unconfirmed: sv.unconfirmed, contradicted: sv.contradicted } : null;

      // ============ REPAIR PASS if issues remain ============
      if (badFacts > 0 && sv) {
        console.log(`Repair pass needed: ${sv.unconfirmed} unconfirmed, ${sv.contradicted} contradicted`);
        const repairIssues = sv.facts
          .filter(f => f.status === "unconfirmed" || f.status === "contradicted")
          .map(f => `${f.status === "contradicted" ? "❌" : "⚠️"} "${f.fact}"${f.explanation ? ` — ${f.explanation}` : ""}`)
          .join("\n");

        const repairPrompt = `${sourceContext}

--- ТЕКУЩИЙ ТЕКСТ СЕКЦИИ "${sectionConfig.title}" ---
${sectionContent}
--- КОНЕЦ ТЕКСТА ---

--- ФАКТЫ, КОТОРЫЕ НЕОБХОДИМО УДАЛИТЬ ---
${repairIssues}
--- КОНЕЦ СПИСКА ---

ЗАДАЧА: Перепиши секцию, УДАЛИВ все перечисленные выше факты. НЕ перефразируй их, НЕ смягчай — полностью убери из текста.
Оставь только подтверждённые факты со ссылками на источники [N].
Если после удаления секция пуста — верни "Данные не найдены".
Обнови references.`;

        const repairRes = await callAI(lovableKey, aiModel, systemPrompt, repairPrompt, toolProps, [section_key, "references"]);
        if (repairRes.ok) {
          const repairData = await repairRes.json();
          const repairParsed = parseAIResponse(repairData);
          if (repairParsed && repairParsed[section_key]) {
            sectionContent = repairParsed[section_key];
            console.log("Repair pass complete, re-verifying...");
            // Re-verify after repair
            const recheck = await runFactCheck(lovableKey, aiModel, [sectionConfig], { [section_key]: sectionContent }, numberedSources);
            if (recheck.length > 0) sectionVerification = recheck;
          }
        }
      }

      // Get final verification for this section
      const finalSV = sectionVerification.find(v => v.section_key === section_key) || { section_key, facts: [], confirmed: 0, unconfirmed: 0, contradicted: 0 };

      // Determine if repair was applied and what changed
      const repairApplied = badFacts > 0;
      const repairStats = repairApplied && originalCounts ? {
        original_unconfirmed: originalCounts.unconfirmed,
        original_contradicted: originalCounts.contradicted,
        fixed_unconfirmed: originalCounts.unconfirmed - finalSV.unconfirmed,
        fixed_contradicted: originalCounts.contradicted - finalSV.contradicted,
      } : null;

      // ============ UPDATE DB: section + verification ============
      // Load existing generated_from_sources_json to merge verification
      const { data: existingProfile } = await supabase
        .from("partner_profiles")
        .select("generated_from_sources_json")
        .eq("profile_id", profile_id)
        .single();

      let sourcesJson: any = {};
      try {
        const raw = existingProfile?.generated_from_sources_json;
        sourcesJson = raw ? (typeof raw === "string" ? JSON.parse(raw) : raw) : {};
      } catch { sourcesJson = {}; }

      // Replace verification for this section
      const existingVerification: SectionVerification[] = Array.isArray(sourcesJson.verification) ? sourcesJson.verification : [];
      const updatedVerification = existingVerification.filter(v => v.section_key !== section_key);
      updatedVerification.push(finalSV);

      // Recalculate summary with final (post-repair) counts
      const newSummary: any = {
        confirmed: updatedVerification.reduce((s, v) => s + v.confirmed, 0),
        unconfirmed: updatedVerification.reduce((s, v) => s + v.unconfirmed, 0),
        contradicted: updatedVerification.reduce((s, v) => s + v.contradicted, 0),
      };

      // Add repair metadata to summary
      if (repairApplied && repairStats) {
        newSummary.repair_applied = true;
        newSummary.repair_stats = repairStats;
      }

      sourcesJson.verification = updatedVerification;
      sourcesJson.verification_summary = newSummary;

      const { error: updateError } = await supabase
        .from("partner_profiles")
        .update({
          [section_key]: sectionContent,
          references_json: references,
          generated_from_sources_json: sourcesJson,
          updated_by: user.id,
          last_generated_at: new Date().toISOString(),
        })
        .eq("profile_id", profile_id);

      if (updateError) return errorResponse(updateError.message, 500);

      const remainingIssues = finalSV.unconfirmed + finalSV.contradicted;
      console.log(`Section ${section_key} done. Remaining issues: ${remainingIssues}`);

      return new Response(JSON.stringify({
        success: true,
        section_content: sectionContent,
        references,
        section_verification: finalSV,
        verification_summary: newSummary,
        remaining_issues: remainingIssues,
      }), {
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

    const userPrompt = `${sourceContext}\n\nЗаполни все ${sections.length} секций профайла, используя ТОЛЬКО источники из списка выше. Ссылайся на них как [N]. Вызови функцию fill_profile.`;

    const sectionProperties: Record<string, { type: string; description: string }> = {};
    for (const s of sections) {
      sectionProperties[s.key] = { type: "string", description: `${s.title}: ${s.prompt}` };
    }
    sectionProperties["references"] = {
      type: "string",
      description: 'JSON-массив источников с цитатами: [{"number": 1, "text": "Название", "url": "https://...", "quotes": [{"fact_text": "факт из профайла", "source_quote": "дословная цитата из источника"}]}]',
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

    const references = buildReferencesFromSources(numberedSources);

    // ============ FACT-CHECK SECOND PASS ============
    console.log("Running fact-check...");
    const profileContent: Record<string, string> = {};
    for (const key of SECTION_KEYS) {
      if (parsed[key]) profileContent[key] = parsed[key];
    }
    const verification = await runFactCheck(lovableKey, aiModel, sections, profileContent, numberedSources);
    console.log("Fact-check complete:", verification.length, "sections verified");

    // Calculate summary
    const totalConfirmed = verification.reduce((sum, v) => sum + v.confirmed, 0);
    const totalUnconfirmed = verification.reduce((sum, v) => sum + v.unconfirmed, 0);
    const totalContradicted = verification.reduce((sum, v) => sum + v.contradicted, 0);
    console.log(`Verification summary: ✅${totalConfirmed} ⚠️${totalUnconfirmed} ❌${totalContradicted}`);

    const profileData: Record<string, unknown> = {
      partner_id,
      title: `${partner.partner_name} — AI-профайл v${nextVersion}`,
      status: "draft",
      version_number: nextVersion,
      profile_type: "ai_generated",
      source_type: websiteResult.content ? "ai_web" : "ai_card",
      created_by: user.id,
      generation_status: "completed",
      last_generated_at: new Date().toISOString(),
      needs_human_review: true,
      references_json: references,
      generated_from_prompt: compositeSystemPrompt.slice(0, 10000),
      generated_from_sources_json: {
        website_url: partner.website_url || null,
        website_content_length: websiteResult.content.length,
        search_results_count: searchResults.length,
        uploaded_files_count: uploadedFiles.length,
        total_sources: numberedSources.length,
        card_fields: Object.keys(partner).filter((k) => partner[k as keyof typeof partner]),
        verification,
        verification_summary: { confirmed: totalConfirmed, unconfirmed: totalUnconfirmed, contradicted: totalContradicted },
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
    return new Response(JSON.stringify({ success: true, profile, verification }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Unexpected error:", e);
    return errorResponse(e instanceof Error ? e.message : "Unknown error", 500);
  }
});
