

# Добавить поле «OpenAlex» в профиль сотрудника

## Что будет сделано

Добавить ссылку на профиль OpenAlex рядом с ORCID, Scopus, eLibrary и Google Scholar в карточке «Профили в системах цитирования».

## Изменения

### 1. Миграция БД
Добавить колонку `openalex_url text` в таблицу `unit_contacts`.

### 2. `src/pages/UnitContactDetail.tsx`
- Добавить `openalex_url: ""` в state формы и в `useEffect` загрузки
- Добавить поле ввода «OpenAlex» в секцию «Профили в системах цитирования» (после Google Scholar)
- Placeholder: `https://openalex.org/authors/...`

### Затронутые файлы
- Миграция SQL (новая колонка)
- `src/pages/UnitContactDetail.tsx`

