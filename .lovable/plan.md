

# Добавить поле eLibrary в карточку сотрудника

## Изменения

### 1. БД — миграция
Добавить поле `elibrary_id` (text) в таблицу `unit_contacts`.

### 2. UI — UnitContactDetail.tsx
- Добавить `elibrary_id` в состояние формы и в логику сохранения
- Добавить поле ввода «eLibrary Author ID» рядом с ORCID/Scopus/Scholar (сетка 2 колонки — ORCID, Scopus, eLibrary, Scholar — по 2 в ряд)
- Placeholder: `https://elibrary.ru/author_items.asp?authorid=...` или просто ID

### Затронутые файлы
- Миграция: `ALTER TABLE unit_contacts ADD COLUMN elibrary_id text;`
- `src/pages/UnitContactDetail.tsx` — добавить поле в форму

