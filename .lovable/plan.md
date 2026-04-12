

# Короткие ID вместо ссылок в профилях цитирования

## Идея
Все 6 полей хранят только короткий идентификатор. Placeholder показывает формат ID. Рядом с каждым полем — кликабельная иконка-ссылка, которая автоматически формирует URL.

## Маппинг ID → URL

| Поле | Пример ID | Шаблон ссылки |
|------|-----------|---------------|
| ORCID | `0000-0003-0669-5694` | `https://orcid.org/{id}` |
| Scopus | `25929447800` | `https://www.scopus.com/authid/detail.uri?authorId={id}` |
| eLibrary | `177140` | `https://elibrary.ru/author_profile.asp?id={id}` |
| Google Scholar | `ABSiyPEAAAAJ` | `https://scholar.google.com/citations?user={id}` |
| OpenAlex | `A5059854048` | `https://openalex.org/authors/{id}` |
| ResearcherID | `E-6562-2014` | `https://www.webofscience.com/wos/author/rid/{id}` |

## Изменения

### 1. БД — переименовать колонки для консистентности
Миграция:
- `scholar_url` → `scholar_id`
- `openalex_url` → `openalex_id`
- `researcherid_url` → `researcherid`

### 2. `src/pages/UnitContactDetail.tsx`
- Обновить имена полей в state/fetch/save
- Поменять placeholder на короткие примеры ID
- Рядом с каждым заполненным полем добавить иконку `ExternalLink`, которая открывает сформированную ссылку в новой вкладке
- Вынести маппинг `id → url` в хелпер-функцию

### Затронутые файлы
- Миграция SQL (rename columns)
- `src/pages/UnitContactDetail.tsx`

