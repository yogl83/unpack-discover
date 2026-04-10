

# Chunk 2 — Убрать standalone-списки Sources/Evidence, оставить inline-доступ

## Что оставляем
- **Detail-роуты** `/sources/:id` и `/evidence/:id` — нужны, т.к. PartnerDetail и HypothesisDetail ссылаются на них из inline-таблиц
- **Detail-страницы** `SourceDetail.tsx`, `EvidenceDetail.tsx` — без изменений
- **Кнопки «Добавить»** в PartnerDetail — `/sources/new` и `/evidence/new` — тоже остаются (это inline-контекст)

## Что удаляем / меняем

1. **App.tsx** — убрать 2 роута:
   - `<Route path="/sources" element={<Sources />} />`
   - `<Route path="/evidence" element={<EvidencePage />} />`
   - Убрать импорты `Sources` и `EvidencePage`

2. **Placeholder.tsx** — убрать записи `/sources` и `/evidence` из словаря (если страница ещё используется)

3. **Файлы** `src/pages/Sources.tsx` и `src/pages/Evidence.tsx` — удалить (standalone-списки больше не нужны)

## Что НЕ трогаем
- `SourceDetail.tsx`, `EvidenceDetail.tsx` — остаются
- Роуты `/sources/:id`, `/sources/new`, `/evidence/:id`, `/evidence/new` — остаются
- Inline-таблицы в PartnerDetail и HypothesisDetail — остаются
- Sidebar — без изменений (Sources/Evidence там уже нет)

