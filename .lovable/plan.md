

# Контакты без привязки к компании + кнопки добавления

## Идея

Разрешить создание контактов без немедленной привязки к партнёру/коллективу. Партнёра или коллектив можно выбрать позже.

## Шаг 1. Миграция БД

- `ALTER TABLE contacts ALTER COLUMN partner_id DROP NOT NULL;` — внешний контакт может существовать без партнёра
- `ALTER TABLE unit_contacts ALTER COLUMN unit_id DROP NOT NULL;` — внутренний контакт может существовать без коллектива

## Шаг 2. Новые маршруты

В `App.tsx` добавить:
- `/contacts/external/new` → `PartnerContactDetail` (без partnerId)
- `/contacts/external/:contactId` → `PartnerContactDetail` (без partnerId, загрузка по contactId)
- `/contacts/internal/new` → `UnitContactDetail` (без unitId)
- `/contacts/internal/:contactId` → `UnitContactDetail` (без unitId, загрузка по contactId)

## Шаг 3. Доработка `PartnerContactDetail.tsx`

- Если `partnerId` отсутствует в params — работать в «standalone» режиме
- Добавить `<Select>` для выбора партнёра (загрузка из `partners`), nullable
- `partner_id` в payload берётся из формы, может быть `null`
- После сохранения: навигация на `/contacts/external` (если standalone) или на `/partners/:id` (если из карточки)
- Хлебные крошки адаптируются: «Внешние контакты → Новый контакт» или «Партнёр → Контакты → ...»

## Шаг 4. Доработка `UnitContactDetail.tsx`

- Аналогично: если `unitId` отсутствует — standalone режим
- Добавить `<Select>` для выбора коллектива (из `miem_units`), nullable
- Навигация после сохранения: `/contacts/internal` или `/units/:id`

## Шаг 5. Кнопки «Добавить» на реестрах

**`ExternalContacts.tsx`**: кнопка «Добавить контакт» (для `canEdit`) → навигация на `/contacts/external/new`

**`InternalContacts.tsx`**: кнопка «Добавить контакт» (для `canEdit`) → навигация на `/contacts/internal/new`

## Шаг 6. Отображение непривязанных контактов

В таблицах реестров: если `partner_id` / `unit_id` = null, показывать «—» или бейдж «Не привязан».

## Файлы

| Файл | Действие |
|------|----------|
| Миграция SQL | `partner_id DROP NOT NULL`, `unit_id DROP NOT NULL` |
| `src/App.tsx` | 4 новых маршрута |
| `src/pages/PartnerContactDetail.tsx` | Standalone режим + select партнёра |
| `src/pages/UnitContactDetail.tsx` | Standalone режим + select коллектива |
| `src/pages/ExternalContacts.tsx` | Кнопка «Добавить контакт» |
| `src/pages/InternalContacts.tsx` | Кнопка «Добавить контакт» |

