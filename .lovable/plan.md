

# Добавить отдельные поля для публикаций в таблицу contact_portfolio_items

## Текущая проблема
Все метаданные публикации (DOI, режим доступа, PDF-ссылка, arXiv, выходные данные) сейчас склеиваются в одно текстовое поле `description` через разделитель ` | `. Это неудобно для отображения, фильтрации и повторного использования данных.

## Что будет сделано

### 1. Миграция БД — новые колонки в `contact_portfolio_items`
Добавить nullable-поля:
- `doi` (text) — DOI публикации
- `oa_status` (text) — режим доступа: gold, green, hybrid, bronze, diamond, closed
- `oa_url` (text) — ссылка на открытый полнотекст
- `pdf_url` (text) — прямая ссылка на PDF
- `arxiv_url` (text) — ссылка на arXiv-версию
- `source_name` (text) — журнал/конференция (дублирует `organization_name`, но семантически точнее; можно использовать `organization_name` и не добавлять)
- `biblio_volume` (text) — том
- `biblio_issue` (text) — номер
- `biblio_first_page` (text) — первая страница
- `biblio_last_page` (text) — последняя страница

**Примечание**: `organization_name` уже хранит название журнала. Можно не дублировать `source_name`, а продолжить использовать `organization_name`.

### 2. Edge function — расширить ответ
Добавить в `WorkResult` отдельные biblio-поля (`volume`, `issue`, `first_page`, `last_page`) вместо склеенной строки `biblio_string`. Остальные поля (`oa_status`, `oa_url`, `pdf_url`, `arxiv_url`, `doi`, `abstract`) уже возвращаются.

### 3. Маппинг при сохранении импорта (`UnitContactDetail.tsx`)
Вместо склейки в `description`:
```
doi: w.doi,
oa_status: w.oa_status,
oa_url: w.oa_url,
pdf_url: w.pdf_url,
arxiv_url: w.arxiv_url,
biblio_volume: w.volume,
biblio_issue: w.issue,
biblio_first_page: w.first_page,
biblio_last_page: w.last_page,
notes: w.abstract || null,
description: null,
```

### 4. Отображение карточки публикации
- Выходные данные формируются из отдельных полей: `Т. {volume}, № {issue}, С. {first_page}–{last_page}`
- DOI показывается как ссылка
- Режим доступа — бейдж (цветной: зелёный для open, серый для closed)
- PDF / arXiv — иконки-ссылки
- Аннотация (`notes`) — иконка FileText с tooltip

### 5. Диалог редактирования публикации
Добавить поля: DOI, Режим доступа (select), PDF URL, arXiv URL, Том, Номер, Страницы — только когда `item_type === 'publication'`.

## Затронутые файлы
- **Миграция** — новые колонки в `contact_portfolio_items`
- `supabase/functions/fetch-author-publications/index.ts` — отдельные biblio-поля в ответе
- `src/pages/UnitContactDetail.tsx` — маппинг, отображение, форма редактирования
- `src/integrations/supabase/types.ts` — обновится автоматически

