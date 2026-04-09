

# Улучшение отображения пустых листов при синхронизации

## Проблема
Пустые листы Google Sheets отображаются как ошибки (красный ×1), хотя это нормальная ситуация — данных просто нет.

## Решение

### 1. Edge function: не считать пустой лист ошибкой
**Файл:** `supabase/functions/sync-google-sheets/index.ts`
- Вместо `errors: ["No data rows"]` возвращать `skipped: 1` или `empty: true` с пустым массивом errors
- Не добавлять "No data rows" в `row_errors`

### 2. UI: показывать пустые листы нейтрально
**Файл:** `src/components/AdminSync.tsx`
- Если таблица пуста (0 inserted, 0 updated, 0 errors) — показывать серый "—" или "Пусто" вместо красного ×
- Красный × оставить только для реальных ошибок (constraint violations и т.п.)

## Файлы
| Файл | Изменение |
|------|-----------|
| `supabase/functions/sync-google-sheets/index.ts` | Не записывать "No data rows" как ошибку |
| `src/components/AdminSync.tsx` | Нейтральное отображение пустых таблиц |

