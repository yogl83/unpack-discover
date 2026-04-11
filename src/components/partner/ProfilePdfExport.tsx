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
  { key: "talent_needs", label: "Кадровые потребности" },
  { key: "collaboration_opportunities", label: "Возможности сотрудничества" },
  { key: "current_relationship_with_miem", label: "Текущее взаимодействие с МИЭМ" },
  { key: "relationship_with_other_universities", label: "Взаимодействие с другими университетами" },
  { key: "recent_news_and_plans", label: "Последние новости и планы развития" },
  { key: "key_events_and_touchpoints", label: "Ключевые мероприятия" },
  { key: "risks_and_constraints", label: "Риски и ограничения" },
  { key: "recommended_next_steps", label: "Рекомендуемые следующие шаги" },
] as const;

interface QuoteItem {
  fact_text: string;
  source_quote: string;
}

interface ReferenceItem {
  number: number;
  text: string;
  url?: string;
  quotes?: QuoteItem[];
}

interface ProfilePdfExportProps {
  profile: Record<string, any>;
  partnerName: string;
  references: ReferenceItem[];
}

/* ── Markdown table parser ──────────────────────────────── */

function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split("\n").filter(l => l.trim().startsWith("|"));
  if (lines.length < 2) return null;
  const parse = (line: string) =>
    line.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);
  const headers = parse(lines[0]);
  const rows = lines.slice(2).map(parse);
  return { headers, rows };
}

/* ── Content segmenter ──────────────────────────────────── */

type Segment =
  | { type: "text"; content: string }
  | { type: "table"; headers: string[]; rows: string[][] };

function splitContentSegments(text: string): Segment[] {
  const segments: Segment[] = [];
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

/* ── Preprocess raw markdown text ──────────────────────── */

function preprocessText(text: string): string {
  return text
    .replace(/\\?\[(\d+)\]\\?/g, "[$1]")   // unescape \[N\] → [N]
    .replace(/^#{1,6}\s+/gm, "");            // strip heading markers
}

/* ── Inline run: split text into bold/normal runs ──────── */

interface TextRun {
  text: string;
  bold: boolean;
}

function parseInlineRuns(line: string): TextRun[] {
  const runs: TextRun[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) runs.push({ text: line.slice(last, m.index), bold: false });
    runs.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) runs.push({ text: line.slice(last), bold: false });
  if (runs.length === 0) runs.push({ text: line, bold: false });
  return runs;
}

/* ── Detect line type ──────────────────────────────────── */

type LineType =
  | { kind: "bullet"; indent: number; text: string }
  | { kind: "numbered"; indent: number; num: string; text: string }
  | { kind: "sourcesFooter" }
  | { kind: "text"; text: string };

function classifyLine(raw: string): LineType {
  // "Источники: [1], [2]..." footer line — skip in PDF
  if (/^\s*Источники?\s*:\s*\[/.test(raw)) return { kind: "sourcesFooter" };

  const bulletMatch = raw.match(/^(\s*)[-*]\s+(.*)/);
  if (bulletMatch) return { kind: "bullet", indent: bulletMatch[1].length, text: bulletMatch[2] };

  const numMatch = raw.match(/^(\s*)(\d+)\.\s+(.*)/);
  if (numMatch) return { kind: "numbered", indent: numMatch[1].length, num: numMatch[2], text: numMatch[3] };

  return { kind: "text", text: raw };
}

/* ── Font loader ───────────────────────────────────────── */

async function loadFont(url: string): Promise<string> {
  const resp = await fetch(url);
  const buf = await resp.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/* ── Constants ─────────────────────────────────────────── */

const HSE_BLUE: [number, number, number] = [26, 95, 180];
const MARGIN = 15;
const LINE_H = 4.8;
const PARA_GAP = 3;
const BULLET_INDENT = 6;
const HEADER_H = 12;
const FOOTER_H = 10;

/* ── Main component ────────────────────────────────────── */

export function ProfilePdfExport({ profile, partnerName, references }: ProfilePdfExportProps) {
  const [generating, setGenerating] = useState(false);

  async function handleExport() {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const [regularB64, boldB64] = await Promise.all([
        loadFont("/fonts/Roboto-Regular.ttf"),
        loadFont("/fonts/Roboto-Bold.ttf"),
      ]);

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      doc.addFileToVFS("Roboto-Regular.ttf", regularB64);
      doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
      doc.addFileToVFS("Roboto-Bold.ttf", boldB64);
      doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
      doc.setFont("Roboto", "normal");

      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const contentW = pageW - MARGIN * 2;
      const bodyTop = MARGIN + HEADER_H;
      const bodyBottom = pageH - MARGIN - FOOTER_H;
      let y = bodyTop;

      const ensureSpace = (needed: number) => {
        if (y + needed > bodyBottom) {
          doc.addPage();
          y = bodyTop;
        }
      };

      /* ── Draw a single line with mixed bold/normal runs ── */
      const drawRichLine = (runs: TextRun[], x: number, yPos: number, maxW: number) => {
        let cx = x;
        for (const run of runs) {
          doc.setFont("Roboto", run.bold ? "bold" : "normal");
          const w = doc.getTextWidth(run.text);
          if (cx + w > x + maxW) {
            // simple word-wrap fallback: just draw what fits
            doc.text(run.text, cx, yPos, { maxWidth: x + maxW - cx });
          } else {
            doc.text(run.text, cx, yPos);
          }
          cx += w;
        }
        doc.setFont("Roboto", "normal");
      };

      /* ── Render text lines with bold/lists support ─────── */
      const renderTextBlock = (text: string) => {
        const cleaned = preprocessText(text);
        const rawLines = cleaned.split("\n");

        for (const raw of rawLines) {
          const info = classifyLine(raw);
          if (info.kind === "sourcesFooter") continue;

          if (info.kind === "bullet" || info.kind === "numbered") {
            const prefix = info.kind === "bullet" ? "•  " : `${(info as any).num}.  `;
            const bodyText = info.text;
            const runs = parseInlineRuns(bodyText);
            const indentX = MARGIN + BULLET_INDENT;
            const lineMaxW = contentW - BULLET_INDENT;

            // Calculate wrapped lines needed
            const fullText = prefix + runs.map(r => r.text).join("");
            const wrapped = doc.splitTextToSize(fullText, lineMaxW);
            ensureSpace(wrapped.length * LINE_H);

            doc.setFontSize(9);
            doc.setFont("Roboto", "normal");

            for (let li = 0; li < wrapped.length; li++) {
              if (li === 0) {
                doc.text(prefix, indentX, y);
                const prefixW = doc.getTextWidth(prefix);
                drawRichLine(runs, indentX + prefixW, y, lineMaxW - prefixW);
              } else {
                doc.text(wrapped[li], indentX, y);
              }
              y += LINE_H;
            }
            continue;
          }

          // Regular text
          const trimmed = info.text.trim();
          if (!trimmed) { y += PARA_GAP; continue; }

          doc.setFontSize(9);

          // Check if line has bold segments
          const runs = parseInlineRuns(trimmed);
          const plainText = runs.map(r => r.text).join("");
          const wrapped = doc.splitTextToSize(plainText, contentW);

          for (const wLine of wrapped) {
            ensureSpace(LINE_H);
            if (runs.length === 1 && !runs[0].bold) {
              doc.setFont("Roboto", "normal");
              doc.text(wLine, MARGIN, y);
            } else {
              // For the first wrapped line, use rich rendering
              drawRichLine(runs, MARGIN, y, contentW);
            }
            y += LINE_H;
          }
        }
        y += PARA_GAP;
      };

      /* ── Title page area ─────────────────────────────────── */
      doc.setFontSize(18);
      doc.setFont("Roboto", "bold");
      doc.setTextColor(...HSE_BLUE);
      doc.text(partnerName, MARGIN, y);
      y += 9;

      doc.setFontSize(9);
      doc.setFont("Roboto", "normal");
      doc.setTextColor(120, 120, 120);
      const date = profile.profile_date || new Date().toISOString().split("T")[0];
      doc.text(`Профайл v${profile.version_number || 1}  |  ${date}`, MARGIN, y);
      doc.setTextColor(0, 0, 0);
      y += 4;

      // Divider line
      doc.setDrawColor(...HSE_BLUE);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y, pageW - MARGIN, y);
      y += 8;

      /* ── Sections ────────────────────────────────────────── */
      for (const s of SECTIONS) {
        const val = profile[s.key];
        if (!val) continue;

        ensureSpace(18);

        // Section header with colored left bar
        doc.setFillColor(...HSE_BLUE);
        doc.rect(MARGIN, y - 4, 2, 7, "F");

        doc.setFontSize(11);
        doc.setFont("Roboto", "bold");
        doc.setTextColor(...HSE_BLUE);
        doc.text(s.label, MARGIN + 5, y);
        doc.setTextColor(0, 0, 0);
        y += 7;

        const segments = splitContentSegments(val);

        for (const seg of segments) {
          if (seg.type === "table") {
            ensureSpace(20);
            autoTable(doc, {
              startY: y,
              head: [seg.headers],
              body: seg.rows,
              margin: { left: MARGIN, right: MARGIN },
              styles: { fontSize: 8, cellPadding: 2, font: "Roboto" },
              headStyles: { fillColor: HSE_BLUE, textColor: 255, fontStyle: "bold" },
              theme: "grid",
            });
            y = (doc as any).lastAutoTable.finalY + 4;
          } else {
            renderTextBlock(seg.content);
          }
        }

        // Section divider
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, y, pageW - MARGIN, y);
        y += 6;
      }

      /* ── References ──────────────────────────────────────── */
      if (references.length > 0) {
        ensureSpace(15);

        doc.setFillColor(...HSE_BLUE);
        doc.rect(MARGIN, y - 4, 2, 7, "F");
        doc.setFontSize(11);
        doc.setFont("Roboto", "bold");
        doc.setTextColor(...HSE_BLUE);
        doc.text("Источники", MARGIN + 5, y);
        doc.setTextColor(0, 0, 0);
        y += 7;

        doc.setFontSize(8);

        for (const ref of references) {
          ensureSpace(6);

          // Reference title
          doc.setFont("Roboto", "bold");
          const prefix = `[${ref.number}]  `;
          doc.text(prefix, MARGIN, y);
          const prefixW = doc.getTextWidth(prefix);

          doc.setFont("Roboto", "normal");
          const titleText = ref.text || "";
          const titleLines = doc.splitTextToSize(titleText, contentW - prefixW);
          for (let i = 0; i < titleLines.length; i++) {
            if (i === 0) {
              doc.text(titleLines[i], MARGIN + prefixW, y);
            } else {
              ensureSpace(3.8);
              doc.text(titleLines[i], MARGIN + prefixW, y);
            }
            y += 3.8;
          }

          // URL
          if (ref.url) {
            ensureSpace(4);
            doc.setTextColor(...HSE_BLUE);
            doc.setFontSize(7);
            const urlLines = doc.splitTextToSize(ref.url, contentW - 4);
            for (const uLine of urlLines) {
              ensureSpace(3.5);
              const lineW = doc.getTextWidth(uLine);
              doc.textWithLink(uLine, MARGIN + 4, y, { url: ref.url });
              doc.link(MARGIN + 4, y - 3, lineW, 3.5, { url: ref.url });
              y += 3.5;
            }
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
          }

          // Quotes
          if (ref.quotes && ref.quotes.length > 0) {
            doc.setFontSize(7);
            doc.setTextColor(100, 100, 100);
            for (const q of ref.quotes) {
              ensureSpace(4);
              const quoteText = `«${q.source_quote}»`;
              const qLines = doc.splitTextToSize(quoteText, contentW - 8);
              for (const ql of qLines) {
                ensureSpace(3.2);
                doc.text(ql, MARGIN + 8, y);
                y += 3.2;
              }
              if (q.fact_text) {
                ensureSpace(3.2);
                doc.setTextColor(140, 140, 140);
                const factLines = doc.splitTextToSize(`→ ${q.fact_text}`, contentW - 8);
                for (const fl of factLines) {
                  ensureSpace(3.2);
                  doc.text(fl, MARGIN + 8, y);
                  y += 3.2;
                }
              }
              doc.setTextColor(100, 100, 100);
            }
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(8);
          }
          y += 2;
        }
      }

      /* ── Headers & footers on every page ─────────────────── */
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);

        // Header: company name + line
        doc.setFontSize(7);
        doc.setFont("Roboto", "normal");
        doc.setTextColor(150, 150, 150);
        doc.text(partnerName, MARGIN, MARGIN + 4);
        doc.text(`Профайл партнёра`, pageW - MARGIN, MARGIN + 4, { align: "right" });
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, MARGIN + HEADER_H - 2, pageW - MARGIN, MARGIN + HEADER_H - 2);

        // Footer: page number + line
        const footerY = pageH - MARGIN;
        doc.line(MARGIN, footerY - 4, pageW - MARGIN, footerY - 4);
        doc.setTextColor(150, 150, 150);
        doc.text(`Стр. ${p} из ${totalPages}`, pageW / 2, footerY, { align: "center" });
        doc.setTextColor(0, 0, 0);
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
