

# Контакты как модуль + нормализация коллективов — План

## Обзор

Три блока работ:
1. Глобальный модуль "Контакты" в sidebar с двумя подпунктами и двумя страницами-реестрами
2. Нормализация модели коллективов: `lead_contact_id`, таблица `unit_contact_memberships`
3. Доработка UI коллектива: выбор руководителя из контактов, управление составом

## Шаг 1. Миграция БД

Одна SQL-миграция:

**1a. ALTER `miem_units`** — добавить `lead_contact_id uuid` (nullable, FK → `unit_contacts.unit_contact_id`)

**1b. CREATE `unit_contact_memberships`**:
- `membership_id` uuid PK default gen_random_uuid()
- `unit_id` uuid NOT NULL (FK → miem_units)
- `unit_contact_id` uuid NOT NULL (FK → unit_contacts)
- `member_role` text default 'other' (lead/deputy/researcher/engineer/pm/expert/other)
- `is_lead` boolean default false
- `is_primary` boolean default false
- `sort_order` integer default 0
- `notes` text
- `created_at` / `updated_at` timestamptz
- Unique constraint: `(unit_id, unit_contact_id)`
- Индексы: `unit_id`, `unit_contact_id`

**1c. RLS для `unit_contact_memberships`** — стандартная модель (SELECT: authenticated; INSERT/UPDATE: admin+analyst; DELETE: admin)

**1d. Миграция `lead_name`**: для каждого `miem_units` с заполненным `lead_name`, найти `unit_contacts` с `unit_id` и `full_name = lead_name` → если найден, установить `lead_contact_id`; создать membership с `is_lead = true`. Если не найден — создать `unit_contact` из `lead_name` и связать.

**1e. Trigger `set_updated_at`** на `unit_contact_memberships`.

## Шаг 2. Sidebar — вложенная навигация

**Файл:** `src/components/AppSidebar.tsx`

Используем уже существующие `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` из `sidebar.tsx`.

Вместо плоского списка — пункт "Контакты" (иконка `Contact`) с двумя подпунктами:
- "Внешние контакты" → `/contacts/external`
- "Внутренние контакты" → `/contacts/internal`

Реализация через `Collapsible` + `SidebarMenuSub`. В collapsed mode показываем только иконку (как остальные пункты). Остальные пункты меню остаются без изменений.

## Шаг 3. Страница "Внешние контакты"

**Новый файл:** `src/pages/ExternalContacts.tsx`
**Маршрут:** `/contacts/external`

- Загрузка из `contacts` с join на `partners(partner_name)`
- Колонки: ФИО, Партнёр, Должность, Тип, Email, Телефон, Primary
- Поиск по ФИО/email
- Фильтр по партнёру (select), по типу контакта, по primary
- Клик по строке → `/partners/:partnerId/contacts/:contactId`
- Клик по партнёру → `/partners/:partnerId`
- Кнопка "Добавить" (для analyst/admin)

## Шаг 4. Страница "Внутренние контакты"

**Новый файл:** `src/pages/InternalContacts.tsx`
**Маршрут:** `/contacts/internal`

- Загрузка из `unit_contacts` с join на `miem_units(unit_name)`
- Колонки: ФИО, Коллектив, Роль, Email, Телефон, Primary
- Поиск по ФИО/email
- Фильтр по коллективу, по роли
- Клик по строке → `/units/:unitId/contacts/:contactId`
- Клик по коллективу → `/units/:unitId`

## Шаг 5. Маршруты

**Файл:** `src/App.tsx` — добавить:
- `/contacts/external` → ExternalContacts
- `/contacts/internal` → InternalContacts

## Шаг 6. Доработка UnitDetail.tsx

**6a. Руководитель** — заменить `<Input>` на `<Select>` / Combobox:
- Загружает `unit_contacts` для данного `unit_id`
- Выбранный контакт записывается в `lead_contact_id`
- Fallback: если `lead_contact_id` null, показывать `lead_name` как legacy текст
- При сохранении пишем `lead_contact_id` в `miem_units`

**6b. Блок "Состав коллектива"** — новая секция в табе "Контакты" или отдельный таб:
- Загрузка из `unit_contact_memberships` JOIN `unit_contacts`
- Таблица: ФИО, Роль, Руководитель, Primary
- Кнопка "Добавить участника" → Combobox из `unit_contacts` с `unit_id` = текущий
- Назначение роли через select
- Удаление из состава
- Отметка is_lead (переключает `lead_contact_id` в `miem_units`)

## Шаг 7. Сохранение совместимости

- Вкладки контактов в `PartnerDetail.tsx` и `UnitDetail.tsx` остаются без изменений
- `lead_name` остаётся в таблице как legacy/fallback, но UI работает через `lead_contact_id`
- `MiemContactsBlock` в `PartnerDetail` — без изменений

## Файлы

| Файл | Действие |
|------|----------|
| Миграция SQL | Создать — ALTER miem_units, CREATE unit_contact_memberships, RLS, data migration |
| `src/components/AppSidebar.tsx` | Изменить — вложенная навигация "Контакты" |
| `src/pages/ExternalContacts.tsx` | Создать — глобальный реестр внешних контактов |
| `src/pages/InternalContacts.tsx` | Создать — глобальный реестр внутренних контактов |
| `src/App.tsx` | Изменить — 2 новых маршрута |
| `src/pages/UnitDetail.tsx` | Изменить — выбор руководителя из контактов, блок состава |

## Phase 2 (не реализуется сейчас)

- Quick stats по контактам (числовые карточки)
- Быстрые действия (сделать primary, назначить руководителя из списка)
- Связь контактов с next_steps / встречами
- История взаимодействий

## Что не меняется

- Существующие формы создания/редактирования контактов (`PartnerContactDetail`, `UnitContactDetail`)
- Google Sheets sync, auth, profiles, partner profiles
- Все существующие маршруты

