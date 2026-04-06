import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Download, Loader2, Save, CheckCircle2 } from "lucide-react";

const TABLES = [
  { key: "partners", label: "Партнёры" },
  { key: "contacts", label: "Контакты" },
  { key: "partner_needs", label: "Задачи партнёров" },
  { key: "collaboration_hypotheses", label: "Гипотезы" },
  { key: "miem_units", label: "Подразделения МИЭМ" },
  { key: "competencies", label: "Компетенции" },
  { key: "sources", label: "Источники" },
  { key: "evidence", label: "Подтверждения" },
  { key: "next_steps", label: "Следующие шаги" },
];

const LS_KEY = "gsheets_spreadsheet_id";
const LOG_KEY = "gsheets_sync_log";

interface SyncLogEntry {
  action: string;
  timestamp: string;
  tables: string[];
  success: boolean;
}

export default function AdminSync() {
  const [spreadsheetId, setSpreadsheetId] = useState(() => localStorage.getItem(LS_KEY) || "");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [syncLog, setSyncLog] = useState<SyncLogEntry[]>(() => {
    try { return JSON.parse(localStorage.getItem(LOG_KEY) || "[]"); } catch { return []; }
  });
  const [saved, setSaved] = useState(!!localStorage.getItem(LS_KEY));

  const saveId = () => {
    localStorage.setItem(LS_KEY, spreadsheetId.trim());
    setSaved(true);
    toast.success("Spreadsheet ID сохранён");
  };

  const toggleTable = (key: string) => {
    setSelectedTables(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const selectAll = () => {
    setSelectedTables(selectedTables.length === TABLES.length ? [] : TABLES.map(t => t.key));
  };

  const addLog = (entry: SyncLogEntry) => {
    const updated = [entry, ...syncLog].slice(0, 20);
    setSyncLog(updated);
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  };

  const handleSync = async (action: "export" | "import") => {
    const id = spreadsheetId.trim() || localStorage.getItem(LS_KEY) || "";
    if (!id) { toast.error("Введите ID таблицы Google Sheets"); return; }

    setLoading(true);
    setResult(null);

    try {
      const res = await supabase.functions.invoke("sync-google-sheets", {
        body: { action, spreadsheet_id: id, tables: selectedTables.length > 0 ? selectedTables : [] },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);

      setResult(res.data);
      addLog({ action, timestamp: new Date().toISOString(), tables: selectedTables.length ? selectedTables : TABLES.map(t => t.key), success: true });
      toast.success(action === "export" ? "Экспорт завершён" : "Импорт завершён");
    } catch (e: any) {
      addLog({ action, timestamp: new Date().toISOString(), tables: selectedTables.length ? selectedTables : TABLES.map(t => t.key), success: false });
      toast.error(e.message || "Ошибка синхронизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Подключение Google Sheets</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="sid">Spreadsheet ID</Label>
            <div className="flex gap-2 mt-1">
              <Input id="sid" placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" value={spreadsheetId} onChange={e => { setSpreadsheetId(e.target.value); setSaved(false); }} className="flex-1" />
              <Button variant="outline" onClick={saveId} disabled={!spreadsheetId.trim()}>
                {saved ? <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" /> : <Save className="h-4 w-4 mr-1" />}
                {saved ? "Сохранено" : "Сохранить"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">ID из URL: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Выбор таблиц</CardTitle></CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-3">
            <Button variant="ghost" size="sm" onClick={selectAll}>
              {selectedTables.length === TABLES.length ? "Снять все" : "Выбрать все"}
            </Button>
            {selectedTables.length === 0 && <span className="text-xs text-muted-foreground">Если ничего не выбрано — все таблицы</span>}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TABLES.map(t => (
              <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox checked={selectedTables.includes(t.key)} onCheckedChange={() => toggleTable(t.key)} />
                {t.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button className="flex-1" onClick={() => handleSync("export")} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Экспорт в Sheets
        </Button>
        <Button className="flex-1" variant="secondary" onClick={() => handleSync("import")} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
          Импорт из Sheets
        </Button>
      </div>

      {result && (
        <Card>
          <CardHeader><CardTitle className="text-base">Результат ({result.action})</CardTitle></CardHeader>
          <CardContent>
            <pre className="text-xs whitespace-pre-wrap bg-muted rounded p-3 max-h-48 overflow-auto">
              {JSON.stringify(result.result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}

      {syncLog.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">История синхронизаций</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-auto">
              {syncLog.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={entry.success ? "text-green-500" : "text-destructive"}>●</span>
                  <span className="font-medium">{entry.action === "export" ? "Экспорт" : "Импорт"}</span>
                  <span className="text-muted-foreground">{new Date(entry.timestamp).toLocaleString("ru-RU")}</span>
                  <span className="text-muted-foreground text-xs">({entry.tables.length} табл.)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
