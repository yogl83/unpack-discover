

# Персональное портфолио сотрудника

## Концепция
Каждый сотрудник (unit_contact) получает собственное портфолио с теми же категориями (проекты, публикации, патенты, гранты, продукты, другое). Портфолио группы в будущем будет автоматически агрегировать данные из персональных портфолио участников.

## Изменения

### 1. БД — миграция

**Новая таблица `contact_portfolio_items`:**
- `portfolio_item_id` (uuid PK)
- `unit_contact_id` (uuid, NOT NULL) — привязка к сотруднику
- `title` (text, NOT NULL)
- `item_type` (text, NOT NULL) — project/publication/patent/grant/product/other
- `organization_name`, `description`, `url`, `notes` (text)
- `year_from`, `year_to` (integer)
- `created_at`, `updated_at` (timestamptz)
- RLS: аналогично `unit_portfolio_items`

**Новые поля в `unit_contacts`** — идентификаторы в системах цитирования:
- `orcid` (text) — ORCID ID
- `scopus_id` (text) — Scopus Author ID
- `scholar_url` (text) — Google Scholar профиль
- `personal_summary` (text) — краткое описание достижений

### 2. UI — карточка сотрудника → вкладки

Текущая карточка — плоская форма без вкладок. Преобразуем в табы:

```text
[Информация] [Портфолио]
```

**Вкладка «Информация»** — текущая форма (ФИО, должность, контакты, роль) + новые поля: ORCID, Scopus ID, Google Scholar URL.

**Вкладка «Портфолио»** — по аналогии с портфолио группы:
- Текстовое поле `personal_summary` (краткое описание достижений)
- Accordion-секции по типам (Проекты, Публикации, Патенты, Гранты, Продукты, Другое) с CRUD
- Каждая секция со своей кнопкой «+ Добавить»

### 3. Файлы для изменения

- **Миграция** — `contact_portfolio_items` + новые поля в `unit_contacts`
- **`src/pages/UnitContactDetail.tsx`** — преобразовать в табы, добавить вкладку Портфолио с accordion-секциями и CRUD

### 4. Будущее (не в этом шаге)

- Агрегация портфолио группы из персональных портфолио участников
- Автоматический импорт публикаций из ORCID/Scopus/Scholar

