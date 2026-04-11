import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { query } = await req.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return new Response(JSON.stringify({ error: "Укажите название, ИНН или ОГРН компании" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: `Ты — помощник для заполнения карточки компании в CRM-системе управления партнёрствами МИЭМ НИУ ВШЭ.

По запросу (название компании, ИНН или ОГРН) найди и верни достоверную информацию о компании.

Правила:
- Возвращай ТОЛЬКО достоверные данные, которые ты знаешь наверняка.
- Если не уверен в каком-то поле — оставь его пустой строкой "".
- ИНН: 10 цифр для юрлиц, 12 для ИП.
- ОГРН: 13 цифр для юрлиц, 15 для ИП.
- company_size: одно из значений startup, small, medium, large, enterprise.
- business_model: одно из B2B, B2G, B2C, mixed.
- geography: регион присутствия (напр. "Россия", "Россия, СНГ", "Международный").`
          },
          {
            role: "user",
            content: `Найди информацию о компании: ${query.trim()}`
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "fill_company_info",
              description: "Заполнить карточку компании достоверными данными",
              parameters: {
                type: "object",
                properties: {
                  partner_name: { type: "string", description: "Торговое/публичное название компании" },
                  legal_name: { type: "string", description: "Полное юридическое наименование" },
                  inn: { type: "string", description: "ИНН (10-12 цифр)" },
                  ogrn: { type: "string", description: "ОГРН (13-15 цифр)" },
                  website_url: { type: "string", description: "Официальный сайт" },
                  industry: { type: "string", description: "Отрасль (IT, Телеком, Финансы и т.д.)" },
                  subindustry: { type: "string", description: "Подотрасль" },
                  business_model: { type: "string", enum: ["B2B", "B2G", "B2C", "mixed", ""] },
                  city: { type: "string", description: "Город головного офиса" },
                  geography: { type: "string", description: "География присутствия" },
                  company_size: { type: "string", enum: ["startup", "small", "medium", "large", "enterprise", ""] },
                },
                required: ["partner_name"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "fill_company_info" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Превышен лимит запросов, попробуйте позже" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Недостаточно средств для AI-запроса" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const text = await response.text();
      console.error("AI gateway error:", response.status, text);
      throw new Error("AI gateway error");
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      throw new Error("AI did not return structured data");
    }

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("autofill error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
