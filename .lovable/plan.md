

# План: Синхронизация с Google Sheets

## Ситуация
Встроенный коннектор Google Sheets в платформе отсутствует. Реализуем интеграцию через Google Service Account + Edge Function.

## Что делаем

### 1. Настройка Google-доступа
- Пользователь создаёт Google Service Account в Google Cloud Console
- Получает JSON-ключ сервисного аккаунта
- Сохраняем ключ как секрет `GOOGLE_SERVICE_ACCOUNT_KEY` через инструмент добавления секретов

### 2. Edge Function `sync-google-sheets`
Файл: `supabase/functions/sync-google-sheets/index.ts`

Эндпоинты:
- **POST /export** — выгрузка данных из БД в Google Sheet (создаёт листы: Partners, Contacts, Needs, Hypotheses, Units, Competencies, Sources, Evidence, NextSteps)
- **POST /import** — загрузка данных из Google Sheet в БД (upsert по ID)

Параметры запроса:
```json
{
  "action": "export" | "import",
  "spreadsheet_id": "1abc...",
  "tables": ["partners", "contacts", ...] // опционально, по умолчанию все
}
```

Логика:
- Авторизация через JWT (только admin)
- Google Sheets API v4 через REST (без SDK, прямые fetch-запросы)
- JWT-подпись для Google OAuth2 через сервисный аккаунт
- При экспорте: очищает лист → записывает заголовки + данные
- При импорте: читает лист → upsert через Supabase service role

### 3. UI-компонент синхронизации
Файл: `src/components/GoogleSheetsSync.tsx`

- Диалог с полем ввода Spreadsheet ID
- Выбор действия: Экспорт / Импорт
- Чекбоксы выбора таблиц
- Прогресс и результат операции
- Кнопка доступна только admin

### 4. Интеграция в интерфейс
- Кнопка «Google Sheets» в шапке или на странице `/users`
- Видна только пользователям с ролью admin

## Файлы
- `supabase/functions/sync-google-sheets/index.ts` — edge function
- `src/components/GoogleSheetsSync.tsx` — UI-диалог синхронизации
- `src/pages/Users.tsx` — добавить кнопку синхронизации
- Секрет: `GOOGLE_SERVICE_ACCOUNT_KEY`

## Порядок
1. Запросить у пользователя секрет Google Service Account
2. Создать edge function
3. Создать UI-компонент
4. Интегрировать в страницу пользователей

