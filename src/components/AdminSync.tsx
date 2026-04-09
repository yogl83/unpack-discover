import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Upload, Download, Loader2, Save, CheckCircle2, RefreshCw,
  Clock, AlertTriangle, Settings2, History, Zap,
} from "lucide-react";

const TABLES = [
  { key: "partners", label: "Партнёры", external: true },
  { key: "contacts", label: "Контакты", external: false },
  { key: "partner_needs", label: "Задачи партнёров", external: false },
  { key: "collaboration_hypotheses", label: "Гипотезы", external: false },
  { key: "miem_units", label: "Подразделения МИЭМ", external: true },
  { key: "competencies", label: "Компетенции", external: false },
  { key: "sources", label: "Источники", external: false },
  { key: "evidence", label: "Подтверждения", external: false },
  { key: "next_steps", label: "Следующие шаги", external: false },
];

interface SyncSettings {
  id: string;
  spreadsheet_id: string | null;
  enabled: boolean;
  auto_sync_enabled: boolean;
  auto_sync_interval_minutes: number;
  default_tables: string[];
  updated_at: string;
}

interface SyncLogEntry {
  id: string;
  action: string;
  triggered_by: string;
  tables: string[];
  stats: Record<string, any>;
  errors: Record<string, string[]>;
  row_errors: Array<{ table: string; row: string; error: string }>;
  started_at: string;
  finished_at: string | null;
  spreadsheet_id: string | null;
}

export default function AdminSync() {
  const qc = useQueryClient();
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Load settings from DB
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["sync-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_settings")
        .select("*")
        .limit(1)
        .single();
      if (error) throw error;
      return data as SyncSettings;
    },
  });

  // Load sync log
  const { data: syncLog } = useQuery({
    queryKey: ["sync-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sync_log")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as unknown as SyncLogEntry[];
    },
  });

  const [editSpreadsheetId, setEditSpreadsheetId] = useState("");
  const [editEnabled, setEditEnabled] = useState(false);
  const [editAutoSync, setEditAutoSync] = useState(false);
  const [editInterval, setEditInterval] = useState(60);
  const [editDefaultTables, setEditDefaultTables] = useState<string[]>([]);

  // Sync form state from loaded settings
  useEffect(() => {
    if (settings) {
      setEditSpreadsheetId(settings.spreadsheet_id || "");
      setEditEnabled(settings.enabled);
      setEditAutoSync(settings.auto_sync_enabled);
      setEditInterval(settings.auto_sync_interval_minutes);
      setEditDefaultTables(settings.default_tables || []);
    }
  }, [settings]);

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (!settings?.id) throw new Error("Settings not loaded");
      const { error } = await supabase
        .from("sync_settings")
        .update({
          spreadsheet_id: editSpreadsheetId.trim() || null,
          enabled: editEnabled,
          auto_sync_enabled: editAutoSync,
          auto_sync_interval_minutes: editInterval,
          default_tables: editDefaultTables,
        })
        .eq("id", settings.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sync-settings"] });
      toast.success("Настройки сохранены");
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleTable = (key: string) => {
    setSelectedTables(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleDefaultTable = (key: string) => {
    setEditDefaultTables(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const handleSync = async (action: "export" | "import") => {
    setLoading(true);
    setResult(null);
    try {
      const res = await supabase.functions.invoke("sync-google-sheets", {
        body: {
          action,
          spreadsheet_id: editSpreadsheetId.trim() || undefined,
          tables: selectedTables.length > 0 ? selectedTables : [],
        },
      });
      if (res.error) throw new Error(res.error.message);
      if (res.data?.error) throw new Error(res.data.error);
      setResult(res.data);
      qc.invalidateQueries({ queryKey: ["sync-log"] });
      toast.success(action === "export" ? "Экспорт завершён" : "Импорт завершён");
    } catch (e: any) {
      toast.error(e.message || "Ошибка синхронизации");
    } finally {
      setLoading(false);
    }
  };

  const lastSync = syncLog?.[0];
  const hasSettingsChanged =
    settings &&
    (editSpreadsheetId.trim() !== (settings.spreadsheet_id || "") ||
      editEnabled !== settings.enabled ||
      editAutoSync !== settings.auto_sync_enabled ||
      editInterval !== settings.auto_sync_interval_minutes ||
      JSON.stringify(editDefaultTables.sort()) !== JSON.stringify((settings.default_tables || []).sort()));

  if (settingsLoading) {
    return <div className="flex items-center gap-2 text-muted-foreground p-4"><Loader2 className="h-4 w-4 animate-spin" /> Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Подключение Google Sheets
            </CardTitle>
            <div className="flex items-center gap-2">
              {settings?.spreadsheet_id ? (
                <Badge variant={settings.enabled ? "default" : "secondary"}>
                  {settings.enabled ? "Активно" : "Отключено"}
                </Badge>
              ) : (
                <Badge variant="destructive">Не настроено</Badge>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="sid">Spreadsheet ID</Label>
            <Input
              id="sid"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              value={editSpreadsheetId}
              onChange={e => setEditSpreadsheetId(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              ID из URL: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
            </p>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={editEnabled} onCheckedChange={setEditEnabled} id="sync-enabled" />
              <Label htmlFor="sync-enabled">Синхронизация включена</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editAutoSync} onCheckedChange={setEditAutoSync} id="auto-sync" />
              <Label htmlFor="auto-sync">Авто-синхронизация</Label>
            </div>
          </div>

          {editAutoSync && (
            <div className="flex items-center gap-2">
              <Label htmlFor="interval" className="whitespace-nowrap">Интервал (мин):</Label>
              <Input
                id="interval"
                type="number"
                min={5}
                max={1440}
                value={editInterval}
                onChange={e => setEditInterval(parseInt(e.target.value) || 60)}
                className="w-24"
              />
            </div>
          )}

          <div>
            <Label className="mb-2 block">Таблицы по умолчанию</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {TABLES.map(t => (
                <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={editDefaultTables.includes(t.key)}
                    onCheckedChange={() => toggleDefaultTable(t.key)}
                  />
                  {t.label}
                  {t.external && <Badge variant="outline" className="text-[10px] px-1">ext</Badge>}
                </label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Если ничего не выбрано — все таблицы. <strong>ext</strong> — поддержка создания через external_id.
            </p>
          </div>

          <Button
            onClick={() => saveSettings.mutate()}
            disabled={!hasSettingsChanged || saveSettings.isPending}
          >
            {saveSettings.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : hasSettingsChanged ? (
              <Save className="h-4 w-4 mr-2" />
            ) : (
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
            )}
            {hasSettingsChanged ? "Сохранить настройки" : "Сохранено"}
          </Button>
        </CardContent>
      </Card>

      {/* Last Sync Status */}
      {lastSync && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Последняя синхронизация
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3 text-sm">
              <Badge variant={Object.keys(lastSync.errors || {}).length === 0 ? "default" : "secondary"}>
                {lastSync.action === "export" ? "Экспорт" : "Импорт"}
              </Badge>
              <span className="text-muted-foreground">
                {new Date(lastSync.started_at).toLocaleString("ru-RU")}
              </span>
              <span className="text-muted-foreground">
                {lastSync.triggered_by === "manual" ? "Вручную" : lastSync.triggered_by === "bot" ? "Бот" : "API"}
              </span>
            </div>
            {lastSync.action === "import" && lastSync.stats && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(lastSync.stats as Record<string, any>).map(([table, s]) => {
                  const stat = s as { inserted?: number; updated?: number; skipped?: number; errors?: string[]; empty?: boolean };
                  const tableLabel = TABLES.find(t => t.key === table)?.label || table;
                  const hasErrors = (stat.errors?.length || 0) > 0;
                  const isEmpty = stat.empty === true;
                  return (
                    <div key={table} className={`rounded border p-2 text-xs ${hasErrors ? "border-destructive/50" : ""}`}>
                      <p className="font-medium">{tableLabel}</p>
                      <div className="flex gap-2 mt-1 text-muted-foreground">
                        {isEmpty && <span className="text-muted-foreground">— Пусто</span>}
                        {!isEmpty && (stat.inserted || 0) > 0 && <span className="text-green-600">+{stat.inserted}</span>}
                        {!isEmpty && (stat.updated || 0) > 0 && <span className="text-blue-600">↻{stat.updated}</span>}
                        {!isEmpty && (stat.skipped || 0) > 0 && <span>⊘{stat.skipped}</span>}
                        {hasErrors && <span className="text-destructive">✕{stat.errors!.length}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {lastSync.action === "export" && lastSync.stats && (
              <div className="mt-2 grid grid-cols-2 md:grid-cols-3 gap-2">
                {Object.entries(lastSync.stats as Record<string, number>).map(([table, count]) => (
                  <div key={table} className="rounded border p-2 text-xs">
                    <p className="font-medium">{TABLES.find(t => t.key === table)?.label || table}</p>
                    <p className="text-muted-foreground">{count} строк</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Manual Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Ручная синхронизация
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedTables(selectedTables.length === TABLES.length ? [] : TABLES.map(t => t.key))}
            >
              {selectedTables.length === TABLES.length ? "Снять все" : "Выбрать все"}
            </Button>
            {selectedTables.length === 0 && (
              <span className="text-xs text-muted-foreground">
                Если ничего не выбрано — {editDefaultTables.length > 0 ? "таблицы по умолчанию" : "все таблицы"}
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {TABLES.map(t => (
              <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={selectedTables.includes(t.key)}
                  onCheckedChange={() => toggleTable(t.key)}
                />
                {t.label}
              </label>
            ))}
          </div>

          <div className="flex gap-3">
            <Button className="flex-1" onClick={() => handleSync("export")} disabled={loading || !editSpreadsheetId.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Экспорт в Sheets
            </Button>
            <Button className="flex-1" variant="secondary" onClick={() => handleSync("import")} disabled={loading || !editSpreadsheetId.trim()}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Импорт из Sheets
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Result */}
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

      {/* Sync History */}
      {(syncLog?.length || 0) > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4" />
                История синхронизаций
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["sync-log"] })}>
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-auto">
              {syncLog!.map(entry => {
                const hasErrors = Object.keys(entry.errors || {}).length > 0;
                const totalInserted = entry.action === "import"
                  ? Object.values(entry.stats || {}).reduce((sum: number, s: any) => sum + (s?.inserted || 0), 0)
                  : 0;
                const totalUpdated = entry.action === "import"
                  ? Object.values(entry.stats || {}).reduce((sum: number, s: any) => sum + (s?.updated || 0), 0)
                  : 0;

                return (
                  <div key={entry.id} className="flex items-center gap-2 text-sm">
                    <span className={hasErrors ? "text-amber-500" : "text-green-500"}>
                      {hasErrors ? <AlertTriangle className="h-3 w-3" /> : "●"}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {entry.action === "export" ? "Экспорт" : "Импорт"}
                    </Badge>
                    <span className="text-muted-foreground text-xs">
                      {new Date(entry.started_at).toLocaleString("ru-RU")}
                    </span>
                    <span className="text-muted-foreground text-xs">
                      ({entry.tables.length} табл.)
                    </span>
                    {entry.action === "import" && (totalInserted > 0 || totalUpdated > 0) && (
                      <span className="text-xs">
                        {totalInserted > 0 && <span className="text-green-600">+{totalInserted}</span>}
                        {totalUpdated > 0 && <span className="text-blue-600 ml-1">↻{totalUpdated}</span>}
                      </span>
                    )}
                    <Badge variant="outline" className="text-[10px]">
                      {entry.triggered_by === "manual" ? "ручн." : entry.triggered_by === "bot" ? "бот" : "API"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
