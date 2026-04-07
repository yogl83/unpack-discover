import { requireAdmin, getServiceClient } from "../_shared/auth.ts";
import { optionsResponse } from "../_shared/cors.ts";
import { successResponse, errorResponse, parseJsonBody } from "../_shared/http.ts";

// --- Google Auth helpers ---

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createGoogleJWT(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = new TextEncoder();
  const headerB64 = base64url(enc.encode(JSON.stringify(header)));
  const payloadB64 = base64url(enc.encode(JSON.stringify(payload)));
  const signingInput = `${headerB64}.${payloadB64}`;

  const pemBody = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\n/g, "");
  const keyBuf = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8", keyBuf, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
  );

  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(signingInput));
  return `${signingInput}.${base64url(sig)}`;
}

async function getAccessToken(serviceAccount: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createGoogleJWT(serviceAccount);
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) {
    console.error("Google token error:", JSON.stringify(data));
    throw { status: 502, message: "Failed to authenticate with Google" };
  }
  return data.access_token;
}

// --- Table configs ---

interface TableConfig {
  table: string;
  sheetName: string;
  columns: string[];
  idColumn: string;
}

const TABLE_CONFIGS: TableConfig[] = [
  {
    table: "partners", sheetName: "Partners", idColumn: "partner_id",
    columns: ["partner_id","partner_name","legal_name","industry","subindustry","company_size","geography","city","website_url","business_model","company_profile","technology_profile","strategic_priorities","partner_status","priority_level","owner_user_id","notes"],
  },
  {
    table: "contacts", sheetName: "Contacts", idColumn: "contact_id",
    columns: ["contact_id","partner_id","full_name","job_title","department_name","email","phone","contact_role","influence_level","relationship_status","last_contact_date","is_primary","notes"],
  },
  {
    table: "partner_needs", sheetName: "Needs", idColumn: "need_id",
    columns: ["need_id","partner_id","title","description","need_type","business_context","expected_result","time_horizon","maturity_level","need_status","priority_level","budget_signal","data_access_signal","recommended_collaboration_format","owner_contact_id","notes"],
  },
  {
    table: "collaboration_hypotheses", sheetName: "Hypotheses", idColumn: "hypothesis_id",
    columns: ["hypothesis_id","partner_id","need_id","unit_id","competency_id","title","rationale","relevance_score","confidence_level","recommended_collaboration_format","recommended_entry_point","hypothesis_status","owner_user_id","notes"],
  },
  {
    table: "miem_units", sheetName: "Units", idColumn: "unit_id",
    columns: ["unit_id","unit_name","lead_name","unit_type","team_summary","research_area","application_domain","business_problem_focus","industry_fit","end_customer_fit","collaboration_formats","value_chain_role","readiness_level","discussion_readiness","notes"],
  },
  {
    table: "competencies", sheetName: "Competencies", idColumn: "competency_id",
    columns: ["competency_id","unit_id","competency_name","competency_type","description","keywords","application_domain","maturity_level","methods_and_tools","evidence_of_experience","education_link","notes"],
  },
  {
    table: "sources", sheetName: "Sources", idColumn: "source_id",
    columns: ["source_id","partner_id","title","source_type","source_url","publisher","publication_date","checked_at","source_reliability","summary","notes"],
  },
  {
    table: "evidence", sheetName: "Evidence", idColumn: "evidence_id",
    columns: ["evidence_id","entity_type","entity_id","partner_id","need_id","unit_id","competency_id","hypothesis_id","field_name","field_value","data_collection_method","source_id","confidence_level","requires_interview_validation","analyst_comment"],
  },
  {
    table: "next_steps", sheetName: "NextSteps", idColumn: "next_step_id",
    columns: ["next_step_id","entity_type","entity_id","partner_id","need_id","hypothesis_id","action_title","action_description","owner_user_id","due_date","next_step_status","result","notes"],
  },
];

const ALLOWED_TABLES = new Set(TABLE_CONFIGS.map((c) => c.table));
const ALLOWED_ACTIONS = new Set(["export", "import"]);

// --- Sheets API helpers ---

async function sheetsRequest(accessToken: string, url: string, method = "GET", body?: unknown) {
  const opts: RequestInit = {
    method,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    console.error(`Sheets API error ${res.status}: ${text}`);
    throw { status: 502, message: `Google Sheets API error (${res.status})` };
  }
  return res.json();
}

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// --- Export ---

async function exportToSheets(supabaseAdmin: ReturnType<typeof getServiceClient>, accessToken: string, spreadsheetId: string, tables: string[]) {
  const configs = tables.length > 0
    ? TABLE_CONFIGS.filter(c => tables.includes(c.table))
    : TABLE_CONFIGS;

  const results: Record<string, number> = {};

  const meta = await sheetsRequest(accessToken, `${SHEETS_BASE}/${spreadsheetId}`);
  const existingSheets = (meta.sheets || []).map((s: Record<string, any>) => s.properties.title);

  for (const cfg of configs) {
    const { data, error } = await supabaseAdmin.from(cfg.table).select("*");
    if (error) {
      console.error(`DB error on ${cfg.table}:`, error.message);
      throw { status: 500, message: `Database read error for ${cfg.table}` };
    }

    if (!existingSheets.includes(cfg.sheetName)) {
      await sheetsRequest(accessToken, `${SHEETS_BASE}/${spreadsheetId}:batchUpdate`, "POST", {
        requests: [{ addSheet: { properties: { title: cfg.sheetName } } }],
      });
    }

    const range = `${cfg.sheetName}!A1`;
    await sheetsRequest(accessToken, `${SHEETS_BASE}/${spreadsheetId}/values/${cfg.sheetName}:clear`, "POST", {});

    const rows: string[][] = [cfg.columns];
    for (const row of (data || [])) {
      rows.push(cfg.columns.map(col => {
        const v = (row as Record<string, unknown>)[col];
        if (v === null || v === undefined) return "";
        if (Array.isArray(v)) return v.join(", ");
        return String(v);
      }));
    }

    await sheetsRequest(accessToken, `${SHEETS_BASE}/${spreadsheetId}/values/${range}?valueInputOption=RAW`, "PUT", {
      range,
      majorDimension: "ROWS",
      values: rows,
    });

    results[cfg.table] = (data || []).length;
  }

  return results;
}

// --- Import ---

async function importFromSheets(supabaseAdmin: ReturnType<typeof getServiceClient>, accessToken: string, spreadsheetId: string, tables: string[]) {
  const configs = tables.length > 0
    ? TABLE_CONFIGS.filter(c => tables.includes(c.table))
    : TABLE_CONFIGS;

  const results: Record<string, { inserted: number; updated: number; errors: string[] }> = {};

  for (const cfg of configs) {
    const result = { inserted: 0, updated: 0, errors: [] as string[] };

    try {
      const sheetData = await sheetsRequest(
        accessToken,
        `${SHEETS_BASE}/${spreadsheetId}/values/${cfg.sheetName}!A1:ZZ`
      );

      const rows: string[][] = sheetData.values || [];
      if (rows.length < 2) {
        result.errors.push("No data rows");
        results[cfg.table] = result;
        continue;
      }

      const headers = rows[0];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const record: Record<string, unknown> = {};
        for (let j = 0; j < headers.length; j++) {
          const col = headers[j];
          if (!cfg.columns.includes(col)) continue;
          let val: unknown = row[j] || null;
          if (val === "") val = null;
          if (val && (col === "keywords" || col === "collaboration_formats")) {
            val = (val as string).split(",").map((s: string) => s.trim()).filter(Boolean);
          }
          if (col === "is_primary" || col === "requires_interview_validation") {
            val = val === "true" || val === "TRUE" || val === "1";
          }
          if (col === "relevance_score" && val) {
            val = parseFloat(val as string) || null;
          }
          record[col] = val;
        }

        if (!record[cfg.idColumn]) {
          result.errors.push(`Row ${i + 1}: missing ID`);
          continue;
        }

        const { error } = await supabaseAdmin
          .from(cfg.table)
          .upsert(record, { onConflict: cfg.idColumn });

        if (error) {
          result.errors.push(`Row ${i + 1}: ${error.message}`);
        } else {
          result.inserted++;
        }
      }
    } catch (e: unknown) {
      const msg = (e as any)?.message || String(e);
      if (msg.includes("404") || msg.includes("Unable to parse range")) {
        result.errors.push(`Sheet "${cfg.sheetName}" not found`);
      } else {
        result.errors.push(`Sync error for ${cfg.sheetName}`);
        console.error(`Import error for ${cfg.table}:`, msg);
      }
    }

    results[cfg.table] = result;
  }

  return results;
}

// --- Request validation ---

interface SyncPayload {
  action: string;
  spreadsheet_id: string;
  tables: string[];
}

function validatePayload(body: unknown): SyncPayload {
  if (!body || typeof body !== "object") {
    throw { status: 400, message: "Invalid request body" };
  }

  const { action, spreadsheet_id, tables } = body as Record<string, unknown>;

  if (!action || typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
    throw { status: 400, message: "action must be 'export' or 'import'" };
  }

  if (!spreadsheet_id || typeof spreadsheet_id !== "string" || spreadsheet_id.trim().length < 10) {
    throw { status: 400, message: "Valid spreadsheet_id is required" };
  }

  // Validate spreadsheet_id format (alphanumeric + hyphens + underscores)
  if (!/^[a-zA-Z0-9_-]+$/.test(spreadsheet_id)) {
    throw { status: 400, message: "Invalid spreadsheet_id format" };
  }

  let validTables: string[] = [];
  if (tables && Array.isArray(tables)) {
    for (const t of tables) {
      if (typeof t !== "string" || !ALLOWED_TABLES.has(t)) {
        throw { status: 400, message: `Invalid table name: ${t}. Allowed: ${[...ALLOWED_TABLES].join(", ")}` };
      }
    }
    validTables = tables as string[];
  }

  return { action, spreadsheet_id: spreadsheet_id.trim(), tables: validTables };
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  const origin = req.headers.get("Origin");

  try {
    await requireAdmin(req.headers.get("Authorization"));

    const rawBody = await parseJsonBody(req);
    const { action, spreadsheet_id, tables } = validatePayload(rawBody);

    // Google auth
    const saKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saKeyRaw) {
      throw { status: 500, message: "Google Service Account key not configured" };
    }

    let serviceAccount: { client_email: string; private_key: string };
    try {
      serviceAccount = JSON.parse(saKeyRaw);
    } catch {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY");
      throw { status: 500, message: "Invalid Google Service Account configuration" };
    }

    const accessToken = await getAccessToken(serviceAccount);
    const adminClient = getServiceClient();

    let result: unknown;
    if (action === "export") {
      result = await exportToSheets(adminClient, accessToken, spreadsheet_id, tables);
    } else {
      result = await importFromSheets(adminClient, accessToken, spreadsheet_id, tables);
    }

    return successResponse({ success: true, action, result }, origin);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return errorResponse(err, origin);
    }
    console.error("sync-google-sheets unexpected error:", err);
    return errorResponse({ status: 500, message: "Internal sync error" }, origin);
  }
});
