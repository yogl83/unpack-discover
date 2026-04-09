

# Двухсторонний контактный контур — План реализации

## Обзор

Добавляем полноценный CRUD для внешних контактов партнёра, новую таблицу `unit_contacts` для внутренних контактов МИЭМ, и связку обоих типов контактов в UI.

## Шаг 1. Миграция БД

Одна SQL-миграция:

**Обновить таблицу `contacts`** — добавить недостающие поля:
- `telegram` text
- `linkedin` text  
- `contact_kind` text default 'official' (official / warm / operational / decision_maker / technical / other)
- `last_interaction_at` timestamptz

**Создать таблицу `unit_contacts`**:
- `unit_contact_id` uuid PK default gen_random_uuid()
- `unit_id` uuid NOT NULL (FK → miem_units)
- `full_name` text NOT NULL
- `job_title` text
- `email` text
- `phone` text
- `telegram` text
- `contact_role` text
- `is_primary` boolean default false
- `availability_notes` text
- `notes` text
- `created_at` / `updated_at` timestamptz

**RLS для `unit_contacts`** — стандартная модель:
- SELECT: all authenticated
- INSERT/UPDATE: admin + analyst
- DELETE: admin only

**Индексы**: `unit_id` на `unit_contacts`

## Шаг 2. Страница контакта партнёра (ContactForm)

Новый файл `src/pages/PartnerContactDetail.tsx`:
- Полноценная форма create/edit для внешнего контакта
- Все поля: ФИО, должность, email, телефон, telegram, linkedin, роль, тип контакта (contact_kind), primary, заметки
- Select для `contact_kind` с русскими лейблами (Официальный, Тёплый, Оперативный, ЛПР, Технический, Другой)
- Кнопки: Сохранить, Удалить (admin)
- Навигация назад к карточке партнёра

## Шаг 3. Страница контакта МИЭМ (UnitContactForm)

Новый файл `src/pages/UnitContactDetail.tsx`:
- Аналогичная форма для внутреннего контакта
- Поля: ФИО, должность, email, телефон, telegram, роль, primary, доступность, заметки
- Навигация назад к карточке коллектива

## Шаг 4. Маршруты

В `App.tsx` добавить:
- `/partners/:partnerId/contacts/new` → PartnerContactDetail
- `/partners/:partnerId/contacts/:contactId` → PartnerContactDetail
- `/units/:unitId/contacts/new` → UnitContactDetail
- `/units/:unitId/contacts/:contactId` → UnitContactDetail

## Шаг 5. Обновить PartnerDetail.tsx

Вкладка «Контакты»:
- Разделить на 2 секции: «Контакты партнёра» и «Контакты МИЭМ»
- Контакты партнёра — из `contacts`, клик по строке ведёт на редактирование
- Badge `contact_kind` на каждом контакте
- Контакты МИЭМ — read-only блок, подтянутый через гипотезы (unit_id → unit_contacts)
- Кнопка «Добавить» ведёт на `/partners/:id/contacts/new`

## Шаг 6. Обновить UnitDetail.tsx

Новая вкладка «Контакты» (иконка Users):
- Список из `unit_contacts` по `unit_id`
- Кнопка «Добавить» → `/units/:id/contacts/new`
- Клик по строке → редактирование
- Badge primary / роль

## Файлы

| Файл | Действие |
|------|----------|
| Миграция SQL | Создать — ALTER contacts + CREATE unit_contacts + RLS |
| `src/pages/PartnerContactDetail.tsx` | Создать — форма внешнего контакта |
| `src/pages/UnitContactDetail.tsx` | Создать — форма внутреннего контакта |
| `src/App.tsx` | Изменить — 4 новых маршрута |
| `src/pages/PartnerDetail.tsx` | Изменить — секция МИЭМ-контактов + клик по строке |
| `src/pages/UnitDetail.tsx` | Изменить — новая вкладка Контакты |

## Phase 2 (не реализуется сейчас)

- Привязка контакта к next_step / гипотезе / встрече
- История коммуникаций (touchpoint log)
- Глобальный поиск/фильтр по контактам
- Массовые операции

## Что не меняется

- Существующие данные в `contacts` сохраняются (ALTER ADD COLUMN)
- Google Sheets sync, auth, profiles — без изменений
- RLS модель консистентна с остальными таблицами

