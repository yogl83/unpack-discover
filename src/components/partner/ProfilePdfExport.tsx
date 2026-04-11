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

/* ── Preprocess raw markdown text ──────────────────────── */

function preprocessText(text: string): string {
  return text
    .replace(/\\?\[(\d+)\]\\?/g, "[$1]")
    .replace(/\\\[/g, "[")
    .replace(/\\\]/g, "]")
    .replace(/\\-/g, "-")
    .replace(/\\([^[\]])/g, "$1")
    .replace(/:([^\s])/g, ": $1")
    .replace(/^#{1,6}\s+/gm, "");
}

/* ── Inline run: split text into bold/normal word tokens ── */

interface WordToken {
  text: string;
  bold: boolean;
}

function tokenizeToWords(line: string): WordToken[] {
  const tokens: WordToken[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      splitRunToWords(line.slice(last, m.index), false, tokens);
    }
    splitRunToWords(m[1], true, tokens);
    last = m.index + m[0].length;
  }
  if (last < line.length) {
    splitRunToWords(line.slice(last), false, tokens);
  }
  return tokens;
}

function splitRunToWords(text: string, bold: boolean, out: WordToken[]) {
  const parts = text.split(/( +)/);
  for (const part of parts) {
    if (part.length > 0) {
      out.push({ text: part, bold });
    }
  }
}

/* ── Markdown table parser ──────────────────────────────── */

function parseMarkdownTable(text: string): { headers: string[]; rows: string[][] } | null {
  const lines = text.trim().split("\n").filter(l => l.trim().startsWith("|"));
  if (lines.length < 2) return null;
  const parse = (line: string) =>
    line.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length);
  let headers = parse(lines[0]);
  let rows = lines.slice(2).map(parse);

  // Filter out entirely empty columns
  const nonEmptyCols = headers.map((h, ci) =>
    h !== "" || rows.some(r => (r[ci] || "").trim() !== "")
  );
  headers = headers.filter((_, ci) => nonEmptyCols[ci]);
  rows = rows.map(r => r.filter((_, ci) => nonEmptyCols[ci]));

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

/* ── Detect line type ──────────────────────────────────── */

type LineType =
  | { kind: "bullet"; text: string }
  | { kind: "numbered"; num: string; text: string }
  | { kind: "sourcesFooter" }
  | { kind: "text"; text: string };

function classifyLine(raw: string): LineType {
  if (/^\s*Источники?\s*:\s*\[/.test(raw)) return { kind: "sourcesFooter" };
  const bulletMatch = raw.match(/^\s*[-*]\s+(.*)/);
  if (bulletMatch) return { kind: "bullet", text: bulletMatch[1] };
  const numMatch = raw.match(/^\s*(\d+)\.\s+(.*)/);
  if (numMatch) return { kind: "numbered", num: numMatch[1], text: numMatch[2] };
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
const LINE_H = 5.2;
const PARA_GAP = 4;
const BULLET_INDENT = 7;
const HEADER_H = 16;
const FOOTER_H = 14;
const SECTION_GAP = 8;

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

      // Track current section for continuation headers
      let currentSectionLabel = "";

      const ensureSpace = (needed: number) => {
        if (y + needed > bodyBottom) {
          doc.addPage();
          y = bodyTop;
          // Draw continuation header if inside a section
          if (currentSectionLabel) {
            doc.setFontSize(9);
            doc.setFont("Roboto", "normal");
            doc.setTextColor(120, 120, 120);
            doc.text(`${currentSectionLabel} (продолжение)`, MARGIN, y);
            doc.setTextColor(0, 0, 0);
            y += LINE_H + 2;
          }
        }
      };

      /* ── Word-by-word rich text rendering ──────────────── */
      const drawRichParagraph = (tokens: WordToken[], startX: number, maxW: number) => {
        let cx = startX;
        const rightEdge = startX + maxW;

        for (const token of tokens) {
          doc.setFont("Roboto", token.bold ? "bold" : "normal");
          const w = doc.getTextWidth(token.text);

          if (cx + w > rightEdge && cx > startX) {
            y += LINE_H;
            ensureSpace(LINE_H);
            cx = startX;
          }

          // Fallback: if single token wider than maxW, draw it anyway to avoid infinite hang
          doc.text(token.text, cx, y);
          cx += w;
        }
        doc.setFont("Roboto", "normal");
        y += LINE_H;
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
            const bodyTokens = tokenizeToWords(info.text);
            const indentX = MARGIN + BULLET_INDENT;
            const lineMaxW = contentW - BULLET_INDENT;

            ensureSpace(LINE_H);
            doc.setFontSize(9);
            doc.setFont("Roboto", "normal");
            doc.text(prefix, indentX, y);
            const prefixW = doc.getTextWidth(prefix);

            let cx = indentX + prefixW;
            const rightEdge = indentX + lineMaxW;

            const textStartX = indentX + prefixW;
            for (const token of bodyTokens) {
              doc.setFont("Roboto", token.bold ? "bold" : "normal");
              const w = doc.getTextWidth(token.text);
              if (cx + w > rightEdge && cx > textStartX) {
                y += LINE_H;
                ensureSpace(LINE_H);
                cx = textStartX; // align continuation with text, not bullet
              }
              doc.text(token.text, cx, y);
              cx += w;
            }
            doc.setFont("Roboto", "normal");
            y += LINE_H + 1; // 1mm gap between list items
            continue;
          }

          // Regular text
          const trimmed = info.text.trim();
          if (!trimmed) { y += PARA_GAP; continue; }

          doc.setFontSize(9);
          ensureSpace(LINE_H);

          const tokens = tokenizeToWords(trimmed);
          drawRichParagraph(tokens, MARGIN, contentW);
        }
        y += PARA_GAP;
      };

      /* ── Title page area ─────────────────────────────────── */
      doc.setFontSize(11);
      doc.setFont("Roboto", "normal");
      doc.setTextColor(120, 120, 120);
      doc.text("Профайл партнёра", MARGIN, y);
      y += 6;

      doc.setFontSize(20);
      doc.setFont("Roboto", "bold");
      doc.setTextColor(...HSE_BLUE);
      doc.text(partnerName, MARGIN, y);
      y += 8;

      doc.setFontSize(9);
      doc.setFont("Roboto", "normal");
      doc.setTextColor(120, 120, 120);
      const date = profile.profile_date || new Date().toISOString().split("T")[0];
      doc.text(`Версия ${profile.version_number || 1}  ·  ${date}`, MARGIN, y);
      doc.setTextColor(0, 0, 0);
      y += 5;

      doc.setDrawColor(...HSE_BLUE);
      doc.setLineWidth(0.5);
      doc.line(MARGIN, y, pageW - MARGIN, y);
      y += 6;

      // If summary_short exists, render it as intro paragraph before sections
      if (profile.summary_short) {
        const summaryText = preprocessText(profile.summary_short);
        doc.setFontSize(9);
        doc.setFont("Roboto", "normal");
        doc.setTextColor(60, 60, 60);
        const summaryTokens = tokenizeToWords(summaryText.replace(/\n/g, " "));
        drawRichParagraph(summaryTokens, MARGIN, contentW);
        doc.setTextColor(0, 0, 0);

        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(MARGIN, y, pageW - MARGIN, y);
        y += SECTION_GAP + 4;
      }

      /* ── Sections ────────────────────────────────────────── */
      for (const s of SECTIONS) {
        // Skip summary_short in sections since we rendered it above
        if (s.key === "summary_short") continue;

        const val = profile[s.key];
        if (!val) continue;

        ensureSpace(20);

        currentSectionLabel = s.label;

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
            const cleanHeaders = seg.headers.map(h => preprocessText(h));
            const cleanRows = seg.rows.map(r => r.map(c => preprocessText(c)));
            const isSmall = cleanRows.length <= 6;
            autoTable(doc, {
              startY: y,
              head: [cleanHeaders],
              body: cleanRows,
              margin: { left: MARGIN, right: MARGIN, top: MARGIN + HEADER_H },
              styles: { fontSize: 8, cellPadding: 4, font: "Roboto", overflow: "linebreak", minCellHeight: 8 },
              headStyles: { fillColor: HSE_BLUE, textColor: 255, fontStyle: "bold" },
              columnStyles: { 0: { cellWidth: "auto", minCellWidth: 40 } },
              showHead: "everyPage",
              pageBreak: isSmall ? "avoid" : "auto",
              theme: "grid",
            });
            y = (doc as any).lastAutoTable.finalY + 4;
          } else {
            renderTextBlock(seg.content);
          }
        }

        currentSectionLabel = "";

        // Draw section divider only if not the last section before references
        if (y + SECTION_GAP < bodyBottom) {
          doc.setDrawColor(220, 220, 220);
          doc.setLineWidth(0.2);
          doc.line(MARGIN, y, pageW - MARGIN, y);
          y += SECTION_GAP;
        }
      }

      /* ── References ──────────────────────────────────────── */
      if (references.length > 0) {
        currentSectionLabel = "Источники";
        ensureSpace(15);

        doc.setFillColor(...HSE_BLUE);
        doc.rect(MARGIN, y - 4, 2, 7, "F");
        doc.setFontSize(11);
        doc.setFont("Roboto", "bold");
        doc.setTextColor(...HSE_BLUE);
        doc.text("Источники", MARGIN + 5, y);
        doc.setTextColor(0, 0, 0);
        y += 7;

        for (let ri = 0; ri < references.length; ri++) {
          const ref = references[ri];
          const seqNum = ri + 1; // sequential numbering regardless of source data

          // Estimate block height to avoid breaking a source mid-page
          const estimatedH = 12
            + (ref.url ? 6 : 0)
            + (ref.quotes ? ref.quotes.length * 10 : 0);
          ensureSpace(Math.min(estimatedH, 50));

          // Reference number + title
          doc.setFontSize(9);
          doc.setFont("Roboto", "bold");
          const prefix = `[${seqNum}]  `;
          doc.text(prefix, MARGIN, y);
          const prefixW = doc.getTextWidth(prefix);

          doc.setFont("Roboto", "normal");
          const titleText = preprocessText(ref.text || "");
          const titleLines = doc.splitTextToSize(titleText, contentW - prefixW);
          for (let i = 0; i < titleLines.length; i++) {
            if (i > 0) { y += 4; ensureSpace(4); }
            doc.text(titleLines[i], MARGIN + prefixW, y);
          }
          y += 5;

          // URL
          if (ref.url) {
            ensureSpace(4);
            doc.setTextColor(...HSE_BLUE);
            doc.setFontSize(7.5);
            const urlLines = doc.splitTextToSize(ref.url, contentW - 6);
            for (const uLine of urlLines) {
              ensureSpace(3.5);
              const lineW = doc.getTextWidth(uLine);
              doc.textWithLink(uLine, MARGIN + 6, y, { url: ref.url });
              doc.link(MARGIN + 6, y - 3, lineW, 3.5, { url: ref.url });
              y += 3.5;
            }
            doc.setTextColor(0, 0, 0);
            y += 1;
          }

          // Quotes
          if (ref.quotes && ref.quotes.length > 0) {
            doc.setFontSize(7.5);
            doc.setTextColor(80, 80, 80);
            for (const q of ref.quotes) {
              ensureSpace(5);
              const quoteText = `«${q.source_quote}»`;
              const qLines = doc.splitTextToSize(quoteText, contentW - 10);
              for (const ql of qLines) {
                ensureSpace(3.5);
                doc.text(ql, MARGIN + 10, y);
                y += 3.5;
              }
              if (q.fact_text) {
                ensureSpace(3.5);
                doc.setFontSize(7);
                doc.setTextColor(100, 100, 100);
                const factLines = doc.splitTextToSize(`→ ${q.fact_text}`, contentW - 10);
                for (const fl of factLines) {
                  ensureSpace(3.5);
                  doc.text(fl, MARGIN + 10, y);
                  y += 3.5;
                }
                doc.setFontSize(7.5);
              }
              doc.setTextColor(80, 80, 80);
            }
            doc.setTextColor(0, 0, 0);
          }

          // Divider between sources
          y += 3;
          doc.setDrawColor(230, 230, 230);
          doc.setLineWidth(0.1);
          doc.line(MARGIN + 4, y, pageW - MARGIN - 4, y);
          y += 3;
        }
        currentSectionLabel = "";
      }

      /* ── Headers & footers on every page ─────────────────── */
      const totalPages = doc.getNumberOfPages();
      const genDate = new Date().toLocaleDateString("ru-RU");
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);

        // Header (skip on first page — title zone serves as header)
        if (p > 1) {
          doc.setFontSize(7);
          doc.setFont("Roboto", "normal");
          doc.setTextColor(120, 120, 120);
          doc.text(partnerName, MARGIN, MARGIN + 4);
          doc.text("Профайл партнёра", pageW - MARGIN, MARGIN + 4, { align: "right" });
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.2);
          doc.line(MARGIN, MARGIN + HEADER_H - 4, pageW - MARGIN, MARGIN + HEADER_H - 4);
        }

        // Footer
        const footerY = pageH - MARGIN;
        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN, footerY - 4, pageW - MARGIN, footerY - 4);
        doc.setTextColor(120, 120, 120);
        doc.setFontSize(7);
        doc.text(`Сгенерировано: ${genDate}`, MARGIN, footerY);
        doc.text(`${p} / ${totalPages}`, pageW - MARGIN, footerY, { align: "right" });
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
