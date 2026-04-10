

# Оценка: что из списка уже сделано, что реально нужно

## Уже закрыто (не требует работы)

| # | Пункт | Статус |
|---|---|---|
| 1 | Sync-покрытие unit_contacts / unit_contact_memberships | **Закрыто.** TABLE_CONFIGS уже содержит оба (строки 116-126 sync-google-sheets). AdminSync.tsx тоже их перечисляет (строки 29-30). |
| 3 | unit_overview с нормализованной моделью лидера | **Закрыто.** Миграция `20260410110558` уже пересоздала view с `LEFT JOIN unit_contacts uc ON uc.unit_contact_id = u.lead_contact_id`. Units.tsx читает `u.lead_name` из view — это вычисляемое поле, не deprecated column. |
| 2 | Матрица покрытия синка в UI | **Частично закрыто.** AdminSync уже показывает `ModeBadge` (create+update / update only) для каждой таблицы. Можно улучшить, но функционально работает. |

## Стоит реализовать (по убыванию приоритета)

### Chunk 1 — Атомарное назначение руководителя (пункт 4)

**Проблема:** `setMemberLead` в UnitDetail.tsx (строки 133-147) делает 3 отдельных запроса без проверки ошибок. Сбой на шаге 2 оставляет данные inconsistent.

**Решение:** Создать RPC-функцию `assign_unit_lead(p_unit_id uuid, p_membership_id uuid, p_contact_id uuid)` которая в одной транзакции:
- сбрасывает `is_lead = false` для всех memberships юнита
- ставит `is_lead = true, member_role = 'lead'` на целевой membership
- обновляет `miem_units.lead_contact_id`

Затем заменить 3 запроса на `supabase.rpc('assign_unit_lead', {...})`.

**Файлы:** миграция (CREATE FUNCTION), `src/pages/UnitDetail.tsx`

### Chunk 2 — Определить судьбу Sources/Evidence (пункт 8)

**Проблема:** Роуты `/sources`, `/sources/:id`, `/evidence`, `/evidence/:id` открыты в App.tsx, но отсутствуют в sidebar. Пользователь может попасть туда только по прямой ссылке.

**Решение (на выбор):**
- **A)** Вернуть в sidebar в секцию «Партнёрства» (если используются)
- **B)** Убрать роуты, оставить доступ только через контекст партнёра/гипотезы (inline-таблицы)

### Chunk 3 — Обновить README (пункт 7)

**Что обновить:**
- Добавить UnitContacts и UnitMemberships в таблицу листов
- Указать что `lead_name` в view вычисляется через JOIN
- Убрать упоминание `lead_name` как deprecated column из основного текста

**Файлы:** `README.md`

### Chunk 4 — window.confirm → AlertDialog (из предыдущего плана)

Все кнопки удаления всё ещё используют `window.confirm()`. Заменить на `AlertDialog` из shadcn/ui на всех detail-страницах.

**Файлы:** PartnerDetail, NeedDetail, HypothesisDetail, NextStepDetail, SourceDetail, EvidenceDetail, UnitDetail, CompetencyDetail, PartnerContactDetail, UnitContactDetail

## Рекомендую отложить (не критично для MVP/прода)

| # | Пункт | Почему |
|---|---|---|
| 5 | Валидаторы качества данных | Полезно, но это отдельный модуль analytics — не блокер запуска |
| 6 | Health-check cron / stale alerts | pg_cron — ручной шаг вне Lovable Cloud. UI-индикатор полезен, но sync_log уже логирует всё |
| 9 | Audit trail для ролей | sync_log есть, роли меняются редко — можно добавить позже |
| 10 | Object-level ownership (owner/reviewer) | Архитектурное изменение RBAC, требует продуктового решения |

## Предлагаемый порядок

1. **Chunk 1** — RPC `assign_unit_lead` + упрощение UnitDetail (самый высокий risk of data corruption)
2. **Chunk 2** — Решение по Sources/Evidence
3. **Chunk 3** — README
4. **Chunk 4** — AlertDialog

