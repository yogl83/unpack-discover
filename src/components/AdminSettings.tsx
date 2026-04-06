import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const ENTITY_TABLES = [
  { key: "partners", label: "Партнёры" },
  { key: "contacts", label: "Контакты" },
  { key: "partner_needs", label: "Задачи партнёров" },
  { key: "collaboration_hypotheses", label: "Гипотезы" },
  { key: "miem_units", label: "Коллективы МИЭМ" },
  { key: "competencies", label: "Компетенции" },
  { key: "sources", label: "Источники" },
  { key: "evidence", label: "Подтверждения" },
  { key: "next_steps", label: "Следующие шаги" },
];

export default function AdminSettings() {
  const qc = useQueryClient();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const results: Record<string, number> = {};
      for (const t of ENTITY_TABLES) {
        const { count } = await supabase.from(t.key as any).select("*", { count: "exact", head: true });
        results[t.key] = count ?? 0;
      }
      return results;
    },
  });

  const handleClearCache = () => {
    qc.clear();
    localStorage.removeItem("gsheets_sync_log");
    toast.success("Кеш очищен");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle className="text-base">Статистика системы</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Загрузка...</p>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ENTITY_TABLES.map(t => (
                <div key={t.key} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{t.label}</p>
                  <p className="text-2xl font-bold">{stats?.[t.key] ?? 0}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Обслуживание</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleClearCache}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Очистить кеш приложения
          </Button>
          <p className="text-xs text-muted-foreground mt-2">Сбрасывает все закешированные данные и историю синхронизаций</p>
        </CardContent>
      </Card>
    </div>
  );
}
