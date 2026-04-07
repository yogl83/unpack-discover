
# План: Зрелая интеграция с Google Sheets

## 1. Миграция БД

### 1a. Таблица `sync_settings` — persistent конфигурация
```
sync_settings (id, spreadsheet_id, enabled, auto_sync_enabled, auto_sync_interval_minutes, default_tables[], updated_by, updated_at)
```
- RLS: только admin может читать/писать
- Одна строка (singleton pattern)

### 1b. Таблица `sync_log` — журнал синхронизаций  
```
sync_log (id, action, triggered_by, tables[], stats jsonb, errors jsonb, started_at, finished_at)
```
- RLS: admin — полный доступ, analyst/viewer — только чтение

### 1c. Колонки `external_source` + `external_id` в `partners` и `miem_units`
- Добавить `external_source text`, `external_id text` + unique constraint `(external_source, external_id)`
- Добавить `last_synced_at timestamptz`

## 2. Edge Function `sync-google-sheets` — переработка

- **Import**: если `idColumn` пустой, но есть `external_source + external_id` → искать по ним, создавать новую запись если не найдена
- **Insert vs Update**: реально различать (SELECT перед upsert или использовать `ON CONFLICT ... DO UPDATE RETURNING`)
- **Sync log**: писать результат в `sync_log`
- **Spreadsheet ID**: читать из `sync_settings` если не передан в payload
- **Field whitelist**: для import из Sheets обновлять только безопасные поля (не трогать `created_at`, `owner_user_id`, системные)

## 3. Edge Function `trigger-sync` — bot/cron endpoint

- Новая функция для внешнего триггера
- Два режима авторизации:
  - Bearer admin token (как обычно)
  - Machine token через секрет `SYNC_API_TOKEN` — для бота
- Читает config из `sync_settings`
- Вызывает ту же логику import/export

## 4. Cron-расписание (pg_cron)

- Если `auto_sync_enabled = true`, создать cron job который вызывает `trigger-sync`
- INSERT через `supabase--insert` (не миграция)

## 5. UI `AdminSync.tsx` — переработка

- Читать/сохранять Spreadsheet ID из `sync_settings` (не localStorage)
- Показывать статус подключения, last sync, auto sync toggle
- История sync из `sync_log`
- Summary: создано / обновлено / ошибок по таблицам
- Ручной import/export остаётся

## 6. Документация

- README секция: настройка Google Sheets, колонки, external_id, бот-интеграция

## Затрагиваемые файлы
- **Миграция**: новые таблицы + ALTER partners/miem_units
- `supabase/functions/sync-google-sheets/index.ts` — переработка import
- `supabase/functions/trigger-sync/index.ts` — новая функция  
- `src/components/AdminSync.tsx` — полная переработка UI
- `README.md` — документация для бота
