import { requireAdmin, getServiceClient, type CallerInfo } from "../_shared/auth.ts";
import { optionsResponse } from "../_shared/cors.ts";
import { successResponse, errorResponse, parseJsonBody } from "../_shared/http.ts";

// --- Google Auth helpers ---

function base64url(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function createGoogleJWT(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now, exp: now + 3600,
  };
  const enc = new TextEncoder();
  const hB64 = base64url(enc.encode(JSON.stringify(header)));
  const pB64 = base64url(enc.encode(JSON.stringify(payload)));
  const input = `${hB64}.${pB64}`;
  const pemBody = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\n/g, "");
  const keyBuf = Uint8Array.from(atob(pemBody), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", keyBuf, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(input));
  return `${input}.${base64url(sig)}`;
}

async function getAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const jwt = await createGoogleJWT(sa);
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
  /** Columns safe to update from external import (whitelist) */
  importableColumns: string[];
  /** Supports creating new records via external_source+external_id */
  supportsExternalCreate: boolean;
}

const TABLE_CONFIGS: TableConfig[] = [
  {
    table: "partners", sheetName: "Partners", idColumn: "partner_id",
    columns: ["partner_id","partner_name","legal_name","industry","subindustry","company_size","geography","city","website_url","business_model","company_profile","technology_profile","strategic_priorities","partner_status","priority_level","notes","external_source","external_id"],
    importableColumns: ["partner_name","legal_name","industry","subindustry","company_size","geography","city","website_url","business_model","company_profile","technology_profile","strategic_priorities","partner_status","priority_level","notes","external_source","external_id"],
    supportsExternalCreate: true,
  },
  {
    table: "contacts", sheetName: "Contacts", idColumn: "contact_id",
    columns: ["contact_id","partner_id","full_name","job_title","department_name","email","phone","contact_role","influence_level","relationship_status","last_contact_date","is_primary","notes"],
    importableColumns: ["full_name","job_title","department_name","email","phone","contact_role","influence_level","relationship_status","last_contact_date","is_primary","notes"],
    supportsExternalCreate: false,
  },
  {
    table: "partner_needs", sheetName: "Needs", idColumn: "need_id",
    columns: ["need_id","partner_id","title","description","need_type","business_context","expected_result","time_horizon","maturity_level","need_status","priority_level","budget_signal","data_access_signal","recommended_collaboration_format","owner_contact_id","notes"],
    importableColumns: ["title","description","need_type","business_context","expected_result","time_horizon","maturity_level","need_status","priority_level","budget_signal","data_access_signal","recommended_collaboration_format","notes"],
    supportsExternalCreate: false,
  },
  {
    table: "collaboration_hypotheses", sheetName: "Hypotheses", idColumn: "hypothesis_id",
    columns: ["hypothesis_id","partner_id","need_id","unit_id","competency_id","title","rationale","relevance_score","confidence_level","recommended_collaboration_format","recommended_entry_point","hypothesis_status","owner_user_id","notes"],
    importableColumns: ["title","rationale","relevance_score","confidence_level","recommended_collaboration_format","recommended_entry_point","hypothesis_status","notes"],
    supportsExternalCreate: false,
  },
  {
    table: "miem_units", sheetName: "Units", idColumn: "unit_id",
    columns: ["unit_id","unit_name","lead_name","unit_type","team_summary","research_area","application_domain","business_problem_focus","industry_fit","end_customer_fit","collaboration_formats","value_chain_role","readiness_level","discussion_readiness","notes","external_source","external_id"],
    importableColumns: ["unit_name","lead_name","unit_type","team_summary","research_area","application_domain","business_problem_focus","industry_fit","end_customer_fit","collaboration_formats","value_chain_role","readiness_level","discussion_readiness","notes","external_source","external_id"],
    supportsExternalCreate: true,
  },
  {
    table: "competencies", sheetName: "Competencies", idColumn: "competency_id",
    columns: ["competency_id","unit_id","competency_name","competency_type","description","keywords","application_domain","maturity_level","methods_and_tools","evidence_of_experience","education_link","notes"],
    importableColumns: ["competency_name","competency_type","description","keywords","application_domain","maturity_level","methods_and_tools","evidence_of_experience","education_link","notes"],
    supportsExternalCreate: false,
  },
  {
    table: "sources", sheetName: "Sources", idColumn: "source_id",
    columns: ["source_id","partner_id","title","source_type","source_url","publisher","publication_date","checked_at","source_reliability","summary","notes"],
    importableColumns: ["title","source_type","source_url","publisher","publication_date","checked_at","source_reliability","summary","notes"],
    supportsExternalCreate: false,
  },
  {
    table: "evidence", sheetName: "Evidence", idColumn: "evidence_id",
    columns: ["evidence_id","entity_type","entity_id","partner_id","need_id","unit_id","competency_id","hypothesis_id","field_name","field_value","data_collection_method","source_id","confidence_level","requires_interview_validation","analyst_comment"],
    importableColumns: ["field_name","field_value","data_collection_method","confidence_level","requires_interview_validation","analyst_comment"],
    supportsExternalCreate: false,
  },
  {
    table: "next_steps", sheetName: "NextSteps", idColumn: "next_step_id",
    columns: ["next_step_id","entity_type","entity_id","partner_id","need_id","hypothesis_id","action_title","action_description","owner_user_id","due_date","next_step_status","result","notes"],
    importableColumns: ["action_title","action_description","due_date","next_step_status","result","notes"],
    supportsExternalCreate: false,
  },
];

const ALLOWED_TABLES = new Set(TABLE_CONFIGS.map(c => c.table));
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
    // Provide actionable message for common errors
    if (res.status === 403) {
      const hint = text.includes("SERVICE_DISABLED")
        ? "Google Sheets API is not enabled in your Google Cloud project. Enable it at https://console.cloud.google.com/apis/library/sheets.googleapis.com"
        : "The service account does not have access to this spreadsheet. Share the spreadsheet with the service account email.";
      throw { status: 403, message: hint };
    }
    throw { status: res.status >= 500 ? 502 : res.status, message: `Google Sheets API error (${res.status})` };
  }
  return res.json();
}

const SHEETS_BASE = "https://sheets.googleapis.com/v4/spreadsheets";

// --- Export ---

async function exportToSheets(
  supabaseAdmin: ReturnType<typeof getServiceClient>,
  accessToken: string,
  spreadsheetId: string,
  tables: string[]
) {
  const configs = tables.length > 0
    ? TABLE_CONFIGS.filter(c => tables.includes(c.table))
    : TABLE_CONFIGS;

  const stats: Record<string, number> = {};
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

    await sheetsRequest(accessToken, `${SHEETS_BASE}/${spreadsheetId}/values/${cfg.sheetName}!A1?valueInputOption=RAW`, "PUT", {
      range: `${cfg.sheetName}!A1`,
      majorDimension: "ROWS",
      values: rows,
    });

    stats[cfg.table] = (data || []).length;
  }

  return stats;
}

// --- Import with external ID support ---

function parseValue(col: string, val: unknown): unknown {
  if (val === "" || val === null || val === undefined) return null;
  if (col === "keywords" || col === "collaboration_formats") {
    return (val as string).split(",").map(s => s.trim()).filter(Boolean);
  }
  if (col === "is_primary" || col === "requires_interview_validation") {
    return val === "true" || val === "TRUE" || val === "1";
  }
  if (col === "relevance_score") {
    return parseFloat(val as string) || null;
  }
  return val;
}

async function importFromSheets(
  supabaseAdmin: ReturnType<typeof getServiceClient>,
  accessToken: string,
  spreadsheetId: string,
  tables: string[]
) {
  const configs = tables.length > 0
    ? TABLE_CONFIGS.filter(c => tables.includes(c.table))
    : TABLE_CONFIGS;

  const stats: Record<string, { inserted: number; updated: number; skipped: number; errors: string[] }> = {};

  for (const cfg of configs) {
    const result = { inserted: 0, updated: 0, skipped: 0, errors: [] as string[] };

    try {
      const sheetData = await sheetsRequest(
        accessToken,
        `${SHEETS_BASE}/${spreadsheetId}/values/${cfg.sheetName}!A1:ZZ`
      );

      const rows: string[][] = sheetData.values || [];
      if (rows.length < 2) {
        result.errors.push("No data rows");
        stats[cfg.table] = result;
        continue;
      }

      const headers = rows[0];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const fullRecord: Record<string, unknown> = {};

        // Parse all columns from sheet
        for (let j = 0; j < headers.length; j++) {
          const col = headers[j];
          if (!cfg.columns.includes(col)) continue;
          fullRecord[col] = parseValue(col, row[j] || null);
        }

        const hasInternalId = !!fullRecord[cfg.idColumn];
        const hasExternalId = !!fullRecord["external_source"] && !!fullRecord["external_id"];

        // Route 1: Has internal ID → upsert by ID (update only importable fields)
        if (hasInternalId) {
          // Check if record exists to distinguish insert vs update
          const { data: existing } = await supabaseAdmin
            .from(cfg.table)
            .select(cfg.idColumn)
            .eq(cfg.idColumn, fullRecord[cfg.idColumn] as string)
            .maybeSingle();

          // Build safe record: only importable columns + id
          const safeRecord: Record<string, unknown> = { [cfg.idColumn]: fullRecord[cfg.idColumn] };
          for (const col of cfg.importableColumns) {
            if (col in fullRecord) safeRecord[col] = fullRecord[col];
          }

          if (cfg.supportsExternalCreate) {
            safeRecord["last_synced_at"] = new Date().toISOString();
          }

          const { error } = await supabaseAdmin
            .from(cfg.table)
            .upsert(safeRecord, { onConflict: cfg.idColumn });

          if (error) {
            result.errors.push(`Row ${i + 1}: ${error.message}`);
          } else if (existing) {
            result.updated++;
          } else {
            result.inserted++;
          }
          continue;
        }

        // Route 2: No internal ID but has external_source + external_id → lookup or create
        if (hasExternalId && cfg.supportsExternalCreate) {
          const extSource = fullRecord["external_source"] as string;
          const extId = fullRecord["external_id"] as string;

          const { data: existing } = await supabaseAdmin
            .from(cfg.table)
            .select(`${cfg.idColumn}, external_source, external_id`)
            .eq("external_source", extSource)
            .eq("external_id", extId)
            .maybeSingle();

          const safeRecord: Record<string, unknown> = {};
          for (const col of cfg.importableColumns) {
            if (col in fullRecord) safeRecord[col] = fullRecord[col];
          }
          safeRecord["last_synced_at"] = new Date().toISOString();

          if (existing) {
            // Update existing record
            const { error } = await supabaseAdmin
              .from(cfg.table)
              .update(safeRecord)
              .eq(cfg.idColumn, (existing as Record<string, unknown>)[cfg.idColumn]);

            if (error) {
              result.errors.push(`Row ${i + 1}: ${error.message}`);
            } else {
              result.updated++;
            }
          } else {
            // Create new record
            // For partners, partner_name is required
            if (cfg.table === "partners" && !safeRecord["partner_name"]) {
              result.errors.push(`Row ${i + 1}: partner_name is required for new partners`);
              continue;
            }
            // For miem_units, unit_name is required
            if (cfg.table === "miem_units" && !safeRecord["unit_name"]) {
              result.errors.push(`Row ${i + 1}: unit_name is required for new units`);
              continue;
            }

            const { error } = await supabaseAdmin
              .from(cfg.table)
              .insert(safeRecord);

            if (error) {
              result.errors.push(`Row ${i + 1}: ${error.message}`);
            } else {
              result.inserted++;
            }
          }
          continue;
        }

        // Route 3: No ID at all → skip
        result.skipped++;
        result.errors.push(`Row ${i + 1}: missing ${cfg.idColumn}${cfg.supportsExternalCreate ? " or external_source+external_id" : ""}`);
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

    stats[cfg.table] = result;
  }

  return stats;
}

// --- Sync log ---

async function writeSyncLog(
  supabaseAdmin: ReturnType<typeof getServiceClient>,
  logEntry: {
    action: string;
    triggered_by: string;
    trigger_user_id?: string;
    spreadsheet_id: string;
    tables: string[];
    stats: unknown;
    errors: unknown;
    row_errors: unknown;
    started_at: string;
  }
) {
  try {
    await supabaseAdmin.from("sync_log").insert({
      ...logEntry,
      finished_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error("Failed to write sync log:", e);
  }
}

// --- Validation ---

interface SyncPayload {
  action: string;
  spreadsheet_id?: string;
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

  // spreadsheet_id is optional — will fall back to sync_settings
  if (spreadsheet_id !== undefined && spreadsheet_id !== null) {
    if (typeof spreadsheet_id !== "string" || spreadsheet_id.trim().length < 10) {
      throw { status: 400, message: "Valid spreadsheet_id is required" };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(spreadsheet_id)) {
      throw { status: 400, message: "Invalid spreadsheet_id format" };
    }
  }

  let validTables: string[] = [];
  if (tables && Array.isArray(tables)) {
    for (const t of tables) {
      if (typeof t !== "string" || !ALLOWED_TABLES.has(t)) {
        throw { status: 400, message: `Invalid table name: ${t}` };
      }
    }
    validTables = tables as string[];
  }

  return {
    action,
    spreadsheet_id: spreadsheet_id ? (spreadsheet_id as string).trim() : undefined,
    tables: validTables,
  };
}

// --- Main handler ---

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  const origin = req.headers.get("Origin");

  try {
    const caller = await requireAdmin(req.headers.get("Authorization"));
    const rawBody = await parseJsonBody(req);
    const payload = validatePayload(rawBody);

    const adminClient = getServiceClient();

    // Resolve spreadsheet_id: payload > sync_settings
    let spreadsheetId = payload.spreadsheet_id;
    if (!spreadsheetId) {
      const { data: settings } = await adminClient
        .from("sync_settings")
        .select("spreadsheet_id")
        .limit(1)
        .single();
      spreadsheetId = settings?.spreadsheet_id;
    }

    if (!spreadsheetId || spreadsheetId.length < 10) {
      throw { status: 400, message: "No spreadsheet_id configured. Set it in admin settings or pass in request." };
    }

    // Google auth
    const saKeyRaw = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!saKeyRaw) throw { status: 500, message: "Google Service Account key not configured" };

    let serviceAccount: { client_email: string; private_key: string };
    try {
      // Handle potential base64-encoded or double-escaped JSON
      let jsonStr = saKeyRaw.trim();
      // Try base64 decode if it doesn't look like JSON
      if (!jsonStr.startsWith("{")) {
        try {
          jsonStr = atob(jsonStr);
        } catch {
          // not base64, use as-is
        }
      }
      serviceAccount = JSON.parse(jsonStr);
      if (!serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error("Missing client_email or private_key");
      }
    } catch (parseErr) {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_KEY:", (parseErr as Error).message, "Raw length:", saKeyRaw.length, "First 20 chars:", saKeyRaw.substring(0, 20));
      throw { status: 500, message: "Invalid Google Service Account configuration. Ensure the secret contains valid JSON with client_email and private_key fields." };
    }

    const accessToken = await getAccessToken(serviceAccount);
    const startedAt = new Date().toISOString();

    let result: unknown;
    if (payload.action === "export") {
      result = await exportToSheets(adminClient, accessToken, spreadsheetId, payload.tables);
    } else {
      result = await importFromSheets(adminClient, accessToken, spreadsheetId, payload.tables);
    }

    // Compute summary for sync log
    const tablesList = payload.tables.length > 0 ? payload.tables : TABLE_CONFIGS.map(c => c.table);
    const allErrors: Record<string, string[]> = {};
    const allRowErrors: Array<{ table: string; row: string; error: string }> = [];

    if (payload.action === "import" && typeof result === "object" && result !== null) {
      const importResult = result as Record<string, { inserted: number; updated: number; skipped: number; errors: string[] }>;
      for (const [table, r] of Object.entries(importResult)) {
        if (r.errors.length > 0) {
          allErrors[table] = r.errors;
          for (const e of r.errors) {
            allRowErrors.push({ table, row: e.split(":")[0] || "", error: e });
          }
        }
      }
    }

    await writeSyncLog(adminClient, {
      action: payload.action,
      triggered_by: "manual",
      trigger_user_id: caller.userId,
      spreadsheet_id: spreadsheetId,
      tables: tablesList,
      stats: result,
      errors: allErrors,
      row_errors: allRowErrors.slice(0, 100),
      started_at: startedAt,
    });

    return successResponse({ success: true, action: payload.action, result }, origin);
  } catch (err) {
    if (typeof err === "object" && err !== null && "status" in err) {
      return errorResponse(err, origin);
    }
    console.error("sync-google-sheets unexpected error:", err);
    return errorResponse({ status: 500, message: "Internal sync error" }, origin);
  }
});
