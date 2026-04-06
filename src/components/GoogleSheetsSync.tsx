import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileSpreadsheet, Upload, Download, Loader2 } from "lucide-react";

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
            <div className="grid grid-cols-2 gap-2">
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
            {selectedTables.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Если ничего не выбрано — синхронизируются все таблицы</p>
            )}
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
