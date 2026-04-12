

# Добавить abstract публикации в описание при импорте

## Что будет сделано
OpenAlex возвращает поле `abstract_inverted_index` — инвертированный индекс абстракта. Edge function будет конвертировать его в обычный текст и возвращать в новом поле `abstract`. При сохранении импорта abstract добавляется в `description` (перед выходными данными и DOI).

## Изменения

### 1. Edge function `fetch-author-publications/index.ts`
- Убрать `select=...` из URL (abstract не входит в допустимые select-поля, нужен полный ответ) — или добавить `abstract_inverted_index` в select
- Конвертировать `abstract_inverted_index` в текст: это объект `{ "word": [pos1, pos2], ... }` — собрать слова по позициям
- Добавить поле `abstract: string | null` в `WorkResult` и в ответ

Функция конвертации:
```typescript
function invertedIndexToText(idx: Record<string, number[]>): string {
  const words: [number, string][] = [];
  for (const [word, positions] of Object.entries(idx)) {
    for (const pos of positions) words.push([pos, word]);
  }
  words.sort((a, b) => a[0] - b[0]);
  return words.map(w => w[1]).join(" ");
}
```

### 2. `src/pages/UnitContactDetail.tsx` — сохранение импорта
- В `description` добавить abstract перед biblio/DOI строкой (если есть)

### Затронутые файлы
- `supabase/functions/fetch-author-publications/index.ts`
- `src/pages/UnitContactDetail.tsx`

