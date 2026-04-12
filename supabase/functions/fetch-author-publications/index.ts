import { getCorsHeaders } from "../_shared/cors.ts";

interface WorkResult {
  title: string;
  year: number | null;
  authors: string;
  doi: string | null;
  url: string | null;
  type: string | null;
  source_name: string | null;
  abstract: string | null;
  oa_status: string | null;
  oa_url: string | null;
  pdf_url: string | null;
  arxiv_url: string | null;
  volume: string | null;
  issue: string | null;
  first_page: string | null;
  last_page: string | null;
  publication_type: string | null;
  language: string | null;
  cited_by_count: number;
  primary_topic: string | null;
  publisher: string | null;
  source_type: string | null;
  keywords: string | null;
  is_retracted: boolean;
}

function invertedIndexToText(idx: Record<string, number[]>): string {
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) words.push([pos, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(w => w[1]).join(" ");
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const cors = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const { openalex_id, orcid, scopus_id } = await req.json();

    let filter = "";
    if (openalex_id) {
      const id = openalex_id.startsWith("A") ? openalex_id : `A${openalex_id}`;
      filter = `author.id:${id}`;
    } else if (orcid) {
      filter = `author.orcid:${orcid}`;
    } else if (scopus_id) {
      filter = `author.scopus:${scopus_id}`;
    } else {
      return new Response(
        JSON.stringify({ error: "Укажите хотя бы один ID: openalex_id, orcid или scopus_id" }),
        { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
      );
    }

    const works: WorkResult[] = [];
    let page = 1;
    const perPage = 200;

    while (page <= 2) {
      const apiUrl = `https://api.openalex.org/works?filter=${filter}&per_page=${perPage}&page=${page}&select=title,publication_year,authorships,doi,type,primary_location,biblio,abstract_inverted_index,open_access,best_oa_location,locations,cited_by_count,language,is_retracted,primary_topic,keywords&sort=publication_year:desc&mailto=miem-partnership@hse.ru`;
      
      const resp = await fetch(apiUrl);
      if (!resp.ok) {
        const text = await resp.text();
        console.error("OpenAlex API error:", resp.status, text);
        return new Response(
          JSON.stringify({ error: `OpenAlex API error: ${resp.status}` }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }

      const data = await resp.json();
      const results = data.results || [];

      for (const w of results) {
        const title = w.title || "(без названия)";
        const year = w.publication_year || null;
        const doi = w.doi || null;
        const type = w.type || null;

        const authorNames = (w.authorships || [])
          .slice(0, 5)
          .map((a: any) => a.author?.display_name || "")
          .filter(Boolean);
        const authors = authorNames.join(", ") + (w.authorships?.length > 5 ? " и др." : "");

        const doiUrl = doi ? `https://doi.org/${doi.replace("https://doi.org/", "")}` : null;
        const source = w.primary_location?.source;
        const source_name = source?.display_name || null;

        const biblio = w.biblio;
        const volume = biblio?.volume || null;
        const issue = biblio?.issue || null;
        const first_page = biblio?.first_page || null;
        const last_page = biblio?.last_page || null;

        const abstractText = w.abstract_inverted_index
          ? invertedIndexToText(w.abstract_inverted_index)
          : null;

        const oa_status = w.open_access?.oa_status || null;
        const oa_url = w.open_access?.oa_url || null;
        const pdf_url = w.best_oa_location?.pdf_url || null;

        let arxiv_url: string | null = null;
        if (w.locations && Array.isArray(w.locations)) {
          for (const loc of w.locations) {
            const srcName = loc.source?.display_name || "";
            if (srcName.toLowerCase().includes("arxiv")) {
              arxiv_url = loc.landing_page_url || loc.pdf_url || null;
              break;
            }
          }
        }

        const url = oa_url || doiUrl;

        // New fields
        const publication_type = type;
        const language = w.language || null;
        const cited_by_count = w.cited_by_count ?? 0;
        const primary_topic = w.primary_topic?.display_name || null;
        const publisher = source?.host_organization_name || null;
        const source_type = source?.type || null;
        const keywordsArr = (w.keywords || []).map((k: any) => k.display_name).filter(Boolean);
        const keywords = keywordsArr.length > 0 ? keywordsArr.join(", ") : null;
        const is_retracted = w.is_retracted === true;

        works.push({
          title, year, authors, doi, url, type, source_name, abstract: abstractText,
          oa_status, oa_url, pdf_url, arxiv_url, volume, issue, first_page, last_page,
          publication_type, language, cited_by_count, primary_topic, publisher, source_type, keywords, is_retracted,
        });
      }

      if (results.length < perPage || works.length >= data.meta?.count) break;
      page++;
    }

    return new Response(
      JSON.stringify({ works, total: works.length }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal error" }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
