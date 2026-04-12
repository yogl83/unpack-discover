

# Расширить импорт публикаций дополнительными полями из OpenAlex

## Какие поля добавить

Из JSON видно несколько полезных данных, которые сейчас не сохраняются. Предлагаю добавить самые практичные:

| Поле | Откуда | Зачем |
|------|--------|-------|
| `publication_type` | `type` | Тип: article, book-chapter, proceedings-article |
| `language` | `language` | Язык публикации (en, ru, ...) |
| `cited_by_count` | `cited_by_count` | Число цитирований — наукометрика |
| `primary_topic` | `primary_topic.display_name` | Научное направление |
| `publisher` | `source.host_organization_name` | Издательство (Springer, Elsevier...) |
| `source_type` | `source.type` | Тип источника (journal, book series, conference) |
| `keywords` | `keywords[].display_name` | Ключевые слова через запятую |
| `is_retracted` | `is_retracted` | Отозвана ли статья |

## Что будет сделано

### 1. Миграция БД
Добавить в `contact_portfolio_items`:
- `publication_type` (text) — article, book-chapter, и т.д.
- `language` (text) — en, ru
- `cited_by_count` (integer, default 0)
- `primary_topic` (text) — научное направление
- `publisher` (text) — издательство
- `source_type` (text) — journal / book series / conference
- `keywords` (text) — ключевые слова через запятую
- `is_retracted` (boolean, default false)

### 2. Edge function
Добавить новые поля в `WorkResult` и извлечение из ответа OpenAlex. Расширить `select` параметр запроса: `primary_topic,keywords,language,is_retracted`.

### 3. Маппинг при сохранении
Прокинуть новые поля в `saveImported`.

### 4. UI карточки публикации
- Тип публикации — бейдж (article / book-chapter / proceedings)
- Цитирования — число рядом с заголовком
- Тема + ключевые слова — мелким шрифтом
- Издательство — в строке с журналом
- `is_retracted` = true → красный бейдж «ОТОЗВАНА»

### Затронутые файлы
- Миграция БД — новые колонки
- `supabase/functions/fetch-author-publications/index.ts`
- `src/pages/UnitContactDetail.tsx`

