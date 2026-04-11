import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, Download, Loader2 } from "lucide-react";

type SyncMode = "create+update" | "update-only";

const TABLES: { key: string; label: string; mode: SyncMode }[] = [
  { key: "partners", label: "Партнёры", mode: "create+update" },
  { key: "contacts", label: "Контакты", mode: "update-only" },
  { key: "partner_needs", label: "Потребности", mode: "update-only" },
  { key: "collaboration_hypotheses", label: "Гипотезы", mode: "update-only" },
  { key: "miem_units", label: "Коллективы", mode: "create+update" },
  { key: "competencies", label: "Компетенции", mode: "update-only" },
  { key: "next_steps", label: "Следующие шаги", mode: "update-only" },
  { key: "unit_contacts", label: "Контакты", mode: "update-only" },
  { key: "unit_contact_memberships", label: "Состав коллективов", mode: "update-only" },
];

export default function GoogleSheetsSync() {
  const [open, setOpen] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const toggleTable = (key: string) => {
    setSelectedTables(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const selectAll = () => {
    setSelectedTables(
      selectedTables.length === TABLES.length ? [] : TABLES.map(t => t.key)
    );
  };

  const handleSync = async (action: "export" | "import") => {
    if (!spreadsheetId.trim()) {
      toast.error("Введите ID таблицы Google Sheets");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      const res = await supabase.functions.invoke("sync-google-sheets", {
        body: {
          action,
          spreadsheet_id: spreadsheetId.trim(),
          tables: selectedTables.length > 0 ? selectedTables : [],
        },
      });

      if (res.error) throw new Error(res.error.message);

      const data = res.data;
      if (data?.error) throw new Error(data.error);

      setResult(data);
      toast.success(action === "export" ? "Экспорт завершён" : "Импорт завершён");
    } catch (e: any) {
      toast.error(e.message || "Ошибка синхронизации");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Google Sheets
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Синхронизация с Google Sheets</DialogTitle>
          <DialogDescription>
            Экспорт данных в Google Sheets или импорт из таблицы
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="spreadsheet-id">Spreadsheet ID</Label>
            <Input
              id="spreadsheet-id"
              placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms"
              value={spreadsheetId}
              onChange={e => setSpreadsheetId(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              ID из URL таблицы: docs.google.com/spreadsheets/d/<strong>ID</strong>/edit
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Таблицы</Label>
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {selectedTables.length === TABLES.length ? "Снять все" : "Выбрать все"}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {TABLES.map(t => (
                <label key={t.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedTables.includes(t.key)}
                    onCheckedChange={() => toggleTable(t.key)}
                  />
                  <span className="flex-1">{t.label}</span>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-1 py-0 leading-tight ${
                      t.mode === "create+update"
                        ? "border-green-500/50 text-green-700 dark:text-green-400"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {t.mode === "create+update" ? "create+update" : "update only"}
                  </Badge>
                </label>
              ))}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2 space-y-0.5">
              {selectedTables.length === 0 && (
                <p>Если ничего не выбрано — синхронизируются все таблицы</p>
              )}
              <p><span className="text-green-700 dark:text-green-400">create+update</span> — создание через external_id · <span className="text-muted-foreground">update only</span> — только обновление</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => handleSync("export")}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
              Экспорт в Sheets
            </Button>
            <Button
              className="flex-1"
              variant="secondary"
              onClick={() => handleSync("import")}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              Импорт из Sheets
            </Button>
          </div>

          {result && (
            <div className="bg-muted rounded-md p-3 text-sm max-h-48 overflow-auto">
              <p className="font-medium mb-1">Результат ({result.action}):</p>
              <pre className="text-xs whitespace-pre-wrap">
                {JSON.stringify(result.result, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
