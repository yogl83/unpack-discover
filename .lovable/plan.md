

# Упрощение навигации + встраивание Sources/Evidence + удаление LinkedIn

## Что уже реализовано (не требует изменений)

- Sidebar: раздел "Контакты" с подпунктами "Внешние" / "Внутренние" — уже есть
- Глобальные реестры `ExternalContacts` и `InternalContacts` — уже есть
- Маршруты `/contacts/external`, `/contacts/internal` — уже есть
- `lead_contact_id` в `miem_units` — уже есть
- `unit_contact_memberships` — уже есть
- Выбор руководителя из `unit_contacts` в `UnitDetail` — уже есть
- Состав коллектива через memberships — уже есть
- Контакты в карточках партнёров и коллективов — уже есть

## Что нужно сделать

### 1. Убрать "Источники" и "Подтверждения" из sidebar

**Файл:** `src/components/AppSidebar.tsx`
- Удалить из `navItems` записи с `url: "/sources"` и `url: "/evidence"`
- Страницы и маршруты остаются (служебный доступ по прямой ссылке)

### 2. Убрать LinkedIn из формы контакта партнёра

**Файл:** `src/pages/PartnerContactDetail.tsx`
- Убрать `linkedin` из `form` state (строка 68)
- Убрать `linkedin` из `useEffect` при загрузке (строка 86)
- Убрать блок `<Label>LinkedIn</Label>` + `<Input>` (строки 177-180)
- В payload `linkedin` не передаётся (оно просто не будет в `form`)

Колонка `linkedin` в БД остаётся (nullable, не мешает).

### 3. Встроить "Источники" в карточку партнёра

**Файл:** `src/pages/PartnerDetail.tsx`
- Добавить новую вкладку "Источники" (иконка `FileText`) в tabs
- Загрузка: `sources` WHERE `partner_id = id`
- Таблица: Название, Тип, Издатель, Дата, Надёжность
- Клик по строке → `/sources/:source_id`
- Кнопка "Добавить" для analyst/admin

### 4. Встроить "Подтверждения" в карточку партнёра

**Файл:** `src/pages/PartnerDetail.tsx`
- Добавить вкладку "Подтверждения" (иконка `ShieldCheck`)
- Загрузка: `evidence` WHERE `partner_id = id`
- Таблица: Сущность, Поле, Значение, Уверенность, Метод
- Клик → `/evidence/:evidence_id`

### 5. Встроить "Подтверждения" в карточку гипотезы

**Файл:** `src/pages/HypothesisDetail.tsx`
- Добавить блок "Подтверждения" под основной формой (для существующих записей)
- Загрузка: `evidence` WHERE `hypothesis_id = id`
- Мини-таблица: Поле, Значение, Уверенность, Источник
- Клик → `/evidence/:evidence_id`

## Файлы

| Файл | Действие |
|------|----------|
| `src/components/AppSidebar.tsx` | Убрать Sources и Evidence из navItems |
| `src/pages/PartnerContactDetail.tsx` | Убрать linkedin из формы |
| `src/pages/PartnerDetail.tsx` | Добавить вкладки "Источники" и "Подтверждения" |
| `src/pages/HypothesisDetail.tsx` | Добавить блок "Подтверждения" |

## Без миграций

Все таблицы и колонки уже существуют. Никаких SQL-изменений не требуется.

## Phase 2

- Quick stats по контактам
- Быстрые действия (сделать primary и т.д.)
- Связь контактов с next_steps / встречами
- Provenance-слой для partner profiles (section-level evidence)

