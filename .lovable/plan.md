

# Обогащение публикаций данными из CrossRef по DOI

## Проблема
OpenAlex для book-chapter возвращает только серию (Lecture Notes in Networks and Systems), но не название конкретного сборника конференции. Также нет ISBN, информации о конференции, точной даты публикации.

## Что добавить из CrossRef

Практичный минимум:
- **`book_title`** — название сборника/книги (второй элемент `container-title` из CrossRef)
- **`conference_name`** — название конференции (из `assertion`)
- **`isbn`** — ISBN (text, через запятую)

Остальное (references, license URL, ORCID авторов) — избыточно для текущих задач.

## Реализация

### 1. Миграция БД
Добавить в `contact_portfolio_items`:
- `book_title` (text) — название сборника/книги
- `conference_name` (text) — название конференции
- `isbn` (text) — ISBN

### 2. Edge function `fetch-author-publications/index.ts`
После получения списка работ из OpenAlex — для каждой работы с DOI делать **один дополнительный запрос** к `https://api.crossref.org/works/{doi}` и извлекать:
- `container-title[1]` → `book_title` (если есть второй элемент)
- `assertion` с `name === "conference_name"` → `conference_name`
- `ISBN` → `isbn` (join через ", ")

**Оптимизация**: CrossRef rate limit — 50 req/sec с polite pool (указываем `mailto`). Запросы делаем последовательно с небольшой задержкой. Для статей типа `article` в журналах можно пропускать CrossRef-запрос (там OpenAlex и так достаточно). Обогащать только `book-chapter` и `proceedings-article`.

### 3. Маппинг при сохранении
Прокинуть `book_title`, `conference_name`, `isbn` в `saveImported`.

### 4. UI
- Для book-chapter показывать: `{book_title}` вместо или после `source_name`
- Конференция — отдельной строкой мелким шрифтом
- ISBN — в деталях карточки

### Затронутые файлы
- Миграция БД — 3 новые колонки
- `supabase/functions/fetch-author-publications/index.ts` — CrossRef-обогащение
- `src/pages/UnitContactDetail.tsx` — маппинг + отображение

### Риски
- CrossRef может быть медленным (300–500ms на запрос) — для 20 book-chapters это +6–10 секунд к импорту
- Не все DOI есть в CrossRef — fallback: оставляем поля null

