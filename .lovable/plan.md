

# Исправить импорт публикаций: добавить журнал и убрать year_to

## Проблемы
1. **Не заполняется «Журнал/конференция»** — OpenAlex API не запрашивает поле `primary_location` (содержит название журнала/venue), и при сохранении не заполняется `organization_name`.
2. **Годы «2010–н.в.»** — при импорте `year_from` заполняется годом публикации, а `year_to` не указан, поэтому UI показывает «–н.в.». Для публикации нужен только год, без диапазона.

## Изменения

### 1. Edge function `fetch-author-publications/index.ts`
- Добавить `primary_location` в `select` параметр API-запроса
- Извлекать `source_name` из `w.primary_location?.source?.display_name` (название журнала/конференции)
- Извлекать `biblio` (том, выпуск, страницы) из `w.biblio` — добавить в `select`
- Возвращать новые поля: `source_name`, `biblio_string` (например «Vol. 12, No. 3, pp. 45–67»)

### 2. `src/pages/UnitContactDetail.tsx` — сохранение импорта
- `organization_name` ← `w.source_name` (журнал/конференция)
- `description` ← собрать строку: выходные данные (biblio) + DOI
- **Убрать `year_to`** для публикаций: не ставить его при импорте (он и так null, проблема в отображении)

### 3. `src/pages/UnitContactDetail.tsx` — отображение года
- Для `item_type === 'publication'`: показывать только `year_from` без «–н.в.»
- Логика: `{p.year_from}{p.year_to ? `–${p.year_to}` : (p.item_type !== 'publication' ? '–н.в.' : '')}`

### Затронутые файлы
- `supabase/functions/fetch-author-publications/index.ts` (добавить source + biblio)
- `src/pages/UnitContactDetail.tsx` (маппинг при сохранении + отображение года)

