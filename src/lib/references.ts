/**
 * Shared reference normalization — единая логика нумерации источников
 * для превью и PDF-экспорта.
 */

export interface ReferenceQuote {
  fact_text: string;
  source_quote: string;
}

export interface ReferenceItem {
  number: number;
  text: string;
  url?: string;
  quotes?: ReferenceQuote[];
}

export interface NormalizedReference extends ReferenceItem {
  displayNumber: number;
}

/**
 * Нормализует массив источников:
 * - displayNumber = ref.number (если есть), иначе index + 1
 * - сортирует по displayNumber
 */
export function normalizeReferences(refs: ReferenceItem[]): NormalizedReference[] {
  return refs
    .map((ref, i) => ({
      ...ref,
      displayNumber: ref.number ?? (i + 1),
    }))
    .sort((a, b) => a.displayNumber - b.displayNumber);
}
