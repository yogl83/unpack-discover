import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const SECTIONS = [
  { key: "summary_short", label: "Краткое описание" },
  { key: "company_overview", label: "Общие сведения о компании" },
  { key: "business_scale", label: "Масштаб и показатели деятельности" },
  { key: "technology_focus", label: "Технологический и продуктовый фокус" },
  { key: "strategic_priorities", label: "Стратегические направления" },
  { key: "relationship_with_other_universities", label: "Взаимодействие с другими университетами" },
  { key: "recent_news_and_plans", label: "Последние новости и планы развития" },
  { key: "key_events_and_touchpoints", label: "Ключевые мероприятия" },
] as const;

interface ReferenceItem {
  number: number;
  text: string;
  url?: string;
}

interface ProfilePdfExportProps {
  profile: Record<string, any>;
  partnerName: string;
  references: ReferenceItem[];
}

function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split("\n").filter(l => l.trim().startsWith("|"));
  if (lines.length < 2) return null;
  const parse = (line: string) =>
    line.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);
  const headers = parse(lines[0]);
  const rows = lines.slice(2).map(parse);
  return { headers, rows };
}

function splitContentSegments(text: string) {
  const segments: Array<{ type: "text"; content: string } | { type: "table"; headers: string[]; rows: string[][] }> = [];
  const lines = text.split("\n");
  let buffer: string[] = [];
  let tableBuffer: string[] = [];
  let inTable = false;

  const flushText = () => {
    if (buffer.length) {
      segments.push({ type: "text", content: buffer.join("\n") });
      buffer = [];
    }
  };
  const flushTable = () => {
    if (tableBuffer.length) {
      const parsed = parseMarkdownTable(tableBuffer.join("\n"));
      if (parsed) segments.push({ type: "table", ...parsed });
      else buffer.push(...tableBuffer);
      tableBuffer = [];
    }
  };

  for (const line of lines) {
    const isTableLine = line.trim().startsWith("|") && line.trim().endsWith("|");
    if (isTableLine) {
      if (!inTable) { flushText(); inTable = true; }
      tableBuffer.push(line);
    } else {
      if (inTable) { flushTable(); inTable = false; }
      buffer.push(line);
    }
  }
  if (inTable) flushTable();
  flushText();
  return segments;
}

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/\[(\d+)\]/g, "[$1]")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1");
}

async function loadFont(url: string): Promise<string> {
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function ProfilePdfExport({ profile, partnerName, references }: ProfilePdfExportProps) {
  const [generating, setGenerating] = useState(false);

  async function handleExport() {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      // Load Roboto fonts for Cyrillic support
      const [regularB64, boldB64] = await Promise.all([
        loadFont("/fonts/Roboto-Regular.ttf"),
        loadFont("/fonts/Roboto-Bold.ttf"),
      ]);

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      // Register fonts
      doc.addFileToVFS("Roboto-Regular.ttf", regularB64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFileToVFS("Roboto-Bold.ttf", boldB64);
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
      doc.setFont("Roboto", "normal");

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 15;
      const contentW = pageW - margin * 2;
      let y = margin;

      const addPageIfNeeded = (needed: number) => {
        if (y + needed > pageH - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // Title
      doc.setFontSize(16);
      doc.setFont("Roboto", "bold");
      doc.text(partnerName, margin, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont("Roboto", "normal");
      doc.setTextColor(120, 120, 120);
      const date = profile.profile_date || new Date().toISOString().split("T")[0];
      doc.text(`Профайл v${profile.version_number || 1} | ${date}`, margin, y);
      doc.setTextColor(0, 0, 0);
      y += 10;

      // Sections
      for (const s of SECTIONS) {
        const val = profile[s.key];
        if (!val) continue;

        addPageIfNeeded(15);

        doc.setFontSize(12);
        doc.setFont("Roboto", "bold");
        doc.text(s.label, margin, y);
        y += 6;

        const segments = splitContentSegments(val);

        for (const seg of segments) {
          if (seg.type === "table") {
            addPageIfNeeded(20);
            autoTable(doc, {
              startY: y,
              head: [seg.headers],
              body: seg.rows,
              margin: { left: margin, right: margin },
              styles: { fontSize: 8, cellPadding: 2, font: "Roboto" },
              headStyles: { fillColor: [26, 95, 180], textColor: 255, fontStyle: "bold" },
              theme: "grid",
            });
            y = (doc as any).lastAutoTable.finalY + 4;
          } else {
            const plainText = stripMarkdown(seg.content).trim();
            if (!plainText) continue;
            doc.setFontSize(9);
            doc.setFont("Roboto", "normal");
            const lines = doc.splitTextToSize(plainText, contentW);
            for (const line of lines) {
              addPageIfNeeded(5);
              doc.text(line, margin, y);
              y += 4.2;
            }
            y += 2;
          }
        }
        y += 4;
      }

      // References
      if (references.length > 0) {
        addPageIfNeeded(15);
        doc.setFontSize(12);
        doc.setFont("Roboto", "bold");
        doc.text("Источники", margin, y);
        y += 6;

        doc.setFontSize(8);
        doc.setFont("Roboto", "normal");
        for (const ref of references) {
          addPageIfNeeded(5);
          const prefix = `[${ref.number}] ${ref.text || ""}`;
          const url = ref.url || "";
          if (url) {
            const prefixWithDash = prefix + " — ";
            const prefixLines = doc.splitTextToSize(prefixWithDash, contentW);
            for (let li = 0; li < prefixLines.length; li++) {
              addPageIfNeeded(4);
              doc.text(prefixLines[li], margin, y);
              y += 3.8;
            }
            // Add clickable URL on next line
            addPageIfNeeded(4);
            doc.setTextColor(26, 95, 180);
            const urlLines = doc.splitTextToSize(url, contentW);
            for (const uLine of urlLines) {
              addPageIfNeeded(4);
              const lineW = doc.getTextWidth(uLine);
              doc.textWithLink(uLine, margin, y, { url });
              doc.link(margin, y - 3, lineW, 4, { url });
              y += 3.8;
            }
            doc.setTextColor(0, 0, 0);
          } else {
            const lines = doc.splitTextToSize(prefix, contentW);
            for (const line of lines) {
              addPageIfNeeded(4);
              doc.text(line, margin, y);
              y += 3.8;
            }
          }
          y += 1;
        }
      }

      const safeName = partnerName.replace(/[^a-zA-Zа-яА-ЯёЁ0-9\s-]/g, "").replace(/\s+/g, "_");
      doc.save(`${safeName}_profile.pdf`);
      toast.success("PDF скачан");
    } catch (e: any) {
      console.error("PDF export error:", e);
      toast.error("Ошибка генерации PDF");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <Button size="sm" variant="outline" onClick={handleExport} disabled={generating}>
      {generating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <FileDown className="mr-1 h-3.5 w-3.5" />}
      Скачать PDF
    </Button>
  );
}
