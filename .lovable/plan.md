

# Добавить поле «ResearcherID» в профиль сотрудника

## Что будет сделано
Добавить ссылку на профиль ResearcherID (Web of Science) рядом с другими профилями в системах цитирования (ORCID, Scopus, eLibrary, Google Scholar, OpenAlex).

## Изменения

### 1. Миграция БД
Добавить колонку `researcherid_url text` в таблицу `unit_contacts`.

```sql
ALTER TABLE public.unit_contacts ADD COLUMN researcherid_url text;
```

### 2. `src/pages/UnitContactDetail.tsx`
- Добавить `researcherid_url: ""` в state формы и в `useEffect` загрузки данных
- Добавить поле ввода «ResearcherID» в секцию «Профили в системах цитирования» (после OpenAlex, в конце списка)
- Placeholder: `https://www.researcherid.com/rid/...`

### Затронутые файлы
- Миграция SQL (новая колонка)
- `src/pages/UnitContactDetail.tsx`

