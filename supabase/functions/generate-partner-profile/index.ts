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
  "talent_needs",
  "collaboration_opportunities",
  "current_relationship_with_miem",
  "relationship_with_other_universities",
  "recent_news_and_plans",
  "key_events_and_touchpoints",
  "risks_and_constraints",
  "recommended_next_steps",
] as const;

const SYSTEM_PROMPT = `Ты — аналитик по партнёрствам МИЭМ НИУ ВШЭ (Московский институт электроники и математики, часть Высшей школы экономики).

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
    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (partner.website_url && firecrawlKey) {
      try {
        let url = partner.website_url.trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          url = `https://${url}`;
        }
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
          // Limit to ~30K chars
          websiteContent = md.slice(0, 30000);
          console.log(`Scraped ${websiteContent.length} chars`);
        } else {
          console.warn("Scrape failed:", JSON.stringify(scrapeData).slice(0, 500));
        }
      } catch (e) {
        console.warn("Scrape error:", e);
      }
    }

    // Step 2: Build user prompt
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
    userPrompt += "\n\nЗаполни все 13 секций профайла, вызвав функцию fill_profile.";

    // Step 3: Call Lovable AI with tool calling
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sectionProperties: Record<string, { type: string; description: string }> = {};
    const sectionLabels: Record<string, string> = {
      summary_short: "Краткое описание (2-3 предложения)",
      company_overview: "Общие сведения о компании",
      business_scale: "Масштаб и показатели деятельности",
      technology_focus: "Технологический и продуктовый фокус",
      strategic_priorities: "Стратегические направления",
      talent_needs: "Кадровые потребности",
      collaboration_opportunities: "Потенциальный запрос к МИЭМ",
      current_relationship_with_miem: "Текущее взаимодействие с МИЭМ",
      relationship_with_other_universities: "Взаимодействие с другими университетами",
      recent_news_and_plans: "Последние новости и планы развития",
      key_events_and_touchpoints: "Ключевые мероприятия",
      risks_and_constraints: "Риски и ограничения",
      recommended_next_steps: "Рекомендуемые шаги",
    };
    for (const key of SECTION_KEYS) {
      sectionProperties[key] = { type: "string", description: sectionLabels[key] };
    }

    console.log("Calling AI...");
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "fill_profile",
              description: "Заполняет все 13 секций профайла партнёра",
              parameters: {
                type: "object",
                properties: sectionProperties,
                required: [...SECTION_KEYS],
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

    let sections: Record<string, string>;
    try {
      sections = JSON.parse(toolCall.function.arguments);
    } catch {
      console.error("Failed to parse tool call args:", toolCall.function.arguments.slice(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse AI response" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("AI sections received:", Object.keys(sections).length);

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
      generated_from_sources_json: {
        website_url: partner.website_url || null,
        website_content_length: websiteContent.length,
        card_fields: Object.keys(partner).filter((k) => partner[k as keyof typeof partner]),
      },
    };
    for (const key of SECTION_KEYS) {
      profileData[key] = sections[key] || null;
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
