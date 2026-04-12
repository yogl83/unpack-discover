

# Автоимпорт публикаций из систем цитирования

## Идея
Добавить кнопку «Импорт публикаций» на вкладку «Портфолио» сотрудника. При нажатии — edge function запрашивает OpenAlex API (бесплатный, без ключа) по ID автора и возвращает список публикаций. Пользователь выбирает, какие добавить в портфолио.

## Почему OpenAlex
- Бесплатный публичный API, не нужен API-ключ
- Покрывает большинство научных публикаций (включая данные Scopus, ORCID)
- Поддерживает поиск по OpenAlex ID, ORCID и Scopus ID
- Возвращает: название, год, авторов, DOI, тип

## Источники поиска
Edge function принимает любой из заполненных ID сотрудника и конвертирует в OpenAlex-запрос:
- `openalex_id` → `https://api.openalex.org/works?filter=author.id:{id}`
- `orcid` → `https://api.openalex.org/works?filter=author.orcid:{id}`
- `scopus_id` → `https://api.openalex.org/works?filter=author.scopus:{id}`

## Изменения

### 1. Edge function `fetch-author-publications/index.ts`
- Принимает `{ openalex_id?, orcid?, scopus_id? }`
- Запрашивает OpenAlex API (до 200 работ, пагинация)
- Возвращает массив `{ title, year, authors, doi, url, type }`
- Без аутентификации к внешнему API (OpenAlex бесплатный)

### 2. `src/pages/UnitContactDetail.tsx`
- Кнопка «Импорт публикаций из OpenAlex» в секции «Публикации» (видна если есть хотя бы один из ID: openalex, orcid, scopus)
- При нажатии — вызов edge function, показ диалога со списком найденных публикаций
- Чекбоксы для выбора, кнопка «Добавить выбранные»
- Выбранные публикации вставляются в `contact_portfolio_items` с `item_type = 'publication'`
- Дедупликация: пропускаются публикации, у которых title+year уже есть в портфолио

### Затронутые файлы
- `supabase/functions/fetch-author-publications/index.ts` (новый)
- `src/pages/UnitContactDetail.tsx` (кнопка + диалог импорта)

### Техническая деталь
OpenAlex API пример:
```
GET https://api.openalex.org/works?filter=author.id:A5059854048&per_page=200&select=title,publication_year,authorships,doi,type
```

