

# Удаление Sources и Evidence из проекта

Полностью убираем сущности «Источники» и «Подтверждения» — таблицы в БД, роуты, UI-компоненты, sync-конфиги.

## Что будет сделано

### 1. Миграция БД — удаление таблиц и FK
- `DROP TABLE evidence CASCADE;`
- `DROP TABLE sources CASCADE;`
- Удалить FK constraints других таблиц, ссылающиеся на sources/evidence (если есть)

### 2. Удаление файлов
- `src/pages/SourceDetail.tsx`
- `src/pages/EvidenceDetail.tsx`

### 3. App.tsx — убрать роуты и импорты
- Убрать `<Route path="/sources/:id" ...>` и `<Route path="/evidence/:id" ...>`
- Убрать импорты `SourceDetail`, `EvidenceDetail`

### 4. PartnerDetail.tsx — убрать вкладки и запросы
- Удалить queries `partner-sources` и `partner-evidence` (строки 72-90)
- Удалить `TabsTrigger` для "sources" и "evidence" (строки 166-172)
- Удалить `TabsContent` блоки "sources" (строки 444-488) и "evidence" (строки 490-534)
- Убрать неиспользуемые импорты (`FileText`, `ShieldCheck`)

### 5. HypothesisDetail.tsx — убрать блок evidence
- Удалить query `hypothesis-evidence` (строки 36-41)
- Удалить весь EVIDENCE BLOCK (строки 207-250)
- Убрать неиспользуемые импорты (`ShieldCheck`, `Table*`, `Badge`)

### 6. Sync — убрать из конфигов
- `supabase/functions/sync-google-sheets/index.ts` — удалить TABLE_CONFIGS для `sources` и `evidence` (строки 97-107)
- `src/components/AdminSync.tsx` — убрать строки `sources` и `evidence` из массива TABLES (строки 26-27)
- `src/components/GoogleSheetsSync.tsx` — убрать строки `sources` и `evidence` (строки 21-22)

### 7. AdminSettings.tsx — убрать из ENTITY_TABLES
- Удалить записи `sources` и `evidence` (строки 17-18)

### 8. Дашборд (Index.tsx) — убрать из счётчиков
- Проверить, есть ли KPI-карточки для sources/evidence, и убрать если есть

## Что НЕ трогаем
- Поле `evidence_of_experience` в таблице `competencies` — это обычное текстовое поле компетенции, не связано с таблицей evidence
- Поле `generated_from_sources_json` в `partner_profiles` — это JSON-поле для AI-генерации, не FK на sources
- `source`/`target` в Sankey-диаграммах — это переменные графа, не имеют отношения к таблице sources

