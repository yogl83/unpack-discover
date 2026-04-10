import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, CheckCircle2, XCircle, AlertTriangle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { TablePagination } from "@/components/TablePagination";

const TIME_RANGES = [
  { label: "24 часа", value: "24h", hours: 24 },
  { label: "7 дней", value: "7d", hours: 168 },
  { label: "30 дней", value: "30d", hours: 720 },
] as const;

const STATUS_OPTIONS = [
  { label: "Все", value: "all" },
  { label: "Отправлено", value: "sent" },
  { label: "Ошибка", value: "dlq" },
  { label: "Подавлено", value: "suppressed" },
  { label: "Ожидает", value: "pending" },
];

function statusBadge(status: string) {
  switch (status) {
    case "sent":
      return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Отправлено</Badge>;
    case "dlq":
    case "failed":
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Ошибка</Badge>;
    case "suppressed":
      return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><AlertTriangle className="h-3 w-3 mr-1" />Подавлено</Badge>;
    case "pending":
      return <Badge variant="secondary">Ожидает</Badge>;
    case "bounced":
      return <Badge variant="destructive">Возврат</Badge>;
    case "complained":
      return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Жалоба</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

const PAGE_SIZE = 25;

export default function AdminEmails() {
  const [timeRange, setTimeRange] = useState("7d");
  const [statusFilter, setStatusFilter] = useState("all");
  const [templateFilter, setTemplateFilter] = useState("all");
  const [page, setPage] = useState(1);

  const sinceDate = useMemo(() => {
    const range = TIME_RANGES.find(r => r.value === timeRange);
    const d = new Date();
    d.setHours(d.getHours() - (range?.hours ?? 168));
    return d.toISOString();
  }, [timeRange]);

  // Fetch all logs for the time range (deduplicated server-side isn't possible via SDK, so we deduplicate client-side)
  const { data: rawLogs, isLoading, refetch
  } = useQuery({
    queryKey: ["admin-email-logs", sinceDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_send_log")
        .select("*")
        .gte("created_at", sinceDate)
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data ?? [];
    },
  });

  // Deduplicate by message_id (latest status per message)
  const logs = useMemo(() => {
    if (!rawLogs) return [];
    const map = new Map<string, typeof rawLogs[0]>();
    for (const row of rawLogs) {
      const key = row.message_id ?? row.id;
      if (!map.has(key)) map.set(key, row);
    }
    return Array.from(map.values());
  }, [rawLogs]);

  // Template names for filter
  const templateNames = useMemo(() => {
    const set = new Set(logs.map(l => l.template_name));
    return Array.from(set).sort();
  }, [logs]);

  // Filtered logs
  const filtered = useMemo(() => {
    return logs.filter(l => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (templateFilter !== "all" && l.template_name !== templateFilter) return false;
      return true;
    });
  }, [logs, statusFilter, templateFilter]);

  // Stats
  const stats = useMemo(() => {
    const s = { total: logs.length, sent: 0, failed: 0, suppressed: 0, pending: 0 };
    for (const l of logs) {
      if (l.status === "sent") s.sent++;
      else if (l.status === "dlq" || l.status === "failed") s.failed++;
      else if (l.status === "suppressed") s.suppressed++;
      else if (l.status === "pending") s.pending++;
    }
    return s;
  }, [logs]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-4">
      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Всего", value: stats.total, icon: Mail, color: "text-foreground" },
          { label: "Отправлено", value: stats.sent, icon: CheckCircle2, color: "text-green-600" },
          { label: "Ошибки", value: stats.failed, icon: XCircle, color: "text-red-600" },
          { label: "Подавлено", value: stats.suppressed, icon: AlertTriangle, color: "text-yellow-600" },
          { label: "Ожидает", value: stats.pending, icon: RefreshCw, color: "text-muted-foreground" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold mt-1">
                {isLoading ? <Skeleton className="h-7 w-10" /> : s.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1">
          {TIME_RANGES.map(r => (
            <Button
              key={r.value}
              size="sm"
              variant={timeRange === r.value ? "default" : "outline"}
              onClick={() => { setTimeRange(r.value); setPage(1); }}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[140px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map(o => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={templateFilter} onValueChange={v => { setTemplateFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[200px] h-8 text-sm">
            <SelectValue placeholder="Шаблон" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все шаблоны</SelectItem>
            {templateNames.map(t => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          <RefreshCw className="h-3.5 w-3.5 mr-1" />Обновить
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Шаблон</TableHead>
              <TableHead>Получатель</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>Дата</TableHead>
              <TableHead>Ошибка</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Нет данных за выбранный период
                </TableCell>
              </TableRow>
            ) : paginated.map(row => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.template_name}</TableCell>
                <TableCell className="text-sm">{row.recipient_email}</TableCell>
                <TableCell>{statusBadge(row.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(row.created_at), "dd MMM HH:mm", { locale: ru })}
                </TableCell>
                <TableCell className="text-xs text-red-600 max-w-[200px] truncate">
                  {row.error_message || "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <TablePagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  );
}
