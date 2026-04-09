

# Исправление импорта contacts и partner_needs из Google Sheets

## Проблема

Edge function `sync-google-sheets` не включает `partner_id` в список `importableColumns` для таблиц `contacts` и `partner_needs`. При импорте строка с `contact_id` делает upsert, но `partner_id` отфильтровывается → NOT NULL violation.

Аналогично: `need_id` и `hypothesis_id` могут быть нужны для связанных таблиц (`next_steps`, `evidence`).

## Решение

Добавить обязательные FK-столбцы в `importableColumns` для всех таблиц, где они нужны:

| Таблица | Добавить в importableColumns |
|---------|------------------------------|
| `contacts` | `partner_id` |
| `partner_needs` | `partner_id`, `owner_contact_id` |
| `collaboration_hypotheses` | `partner_id`, `need_id`, `unit_id`, `competency_id` |
| `next_steps` | `entity_type`, `entity_id`, `partner_id`, `need_id`, `hypothesis_id` |
| `evidence` | `entity_type`, `entity_id`, `source_id`, `partner_id`, `need_id`, `unit_id`, `competency_id`, `hypothesis_id` |

## Файлы

- `supabase/functions/sync-google-sheets/index.ts` — обновить `importableColumns` для 5 таблиц

После изменения — передеплой edge function и повторный импорт.

