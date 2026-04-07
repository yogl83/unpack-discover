# МИЭМ НИУ ВШЭ — Система управления партнёрствами

Внутренняя система для управления партнёрами, потребностями, гипотезами сотрудничества и компетенциями подразделений МИЭМ.

## Стек

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Lovable Cloud (Supabase)
- **Роли:** admin, analyst, viewer

## Настройка окружения

Файл `.env` генерируется автоматически платформой Lovable Cloud. Не коммитьте `.env` в репозиторий.

Клиентские переменные (публичные, безопасно хранить в `.env`):
- `VITE_SUPABASE_URL` — URL проекта
- `VITE_SUPABASE_PUBLISHABLE_KEY` — anon key
- `VITE_SUPABASE_PROJECT_ID` — ID проекта

Серверные секреты (доступны только в Edge Functions):
- `SUPABASE_SERVICE_ROLE_KEY` — полный доступ к БД
- `GOOGLE_SERVICE_ACCOUNT_KEY` — ключ для Google Sheets API

## Модель доступа

Это **закрытая внутренняя система**. Публичная самостоятельная регистрация отключена.

- Пользователей создаёт только администратор через панель `/admin`
- Self-signup отключён в конфигурации Auth
- Все привилегированные операции (создание/удаление пользователей, смена ролей) выполняются через защищённые Edge Functions с server-side проверкой роли admin

### Ручные шаги в настройке

Убедитесь, что в настройках Auth проекта:
- **Disable signup** = `true` (отключена самостоятельная регистрация)
- **Auto-confirm email** = `true` (для invite-only flow через admin)

## Edge Functions

| Функция | Назначение | Требует admin |
|---|---|---|
| `create-admin` | Создание пользователей | ✅ |
| `delete-user` | Удаление пользователей | ✅ |
| `update-user-role` | Изменение роли | ✅ |
| `sync-google-sheets` | Синхронизация с Google Sheets | ✅ |

Все функции используют общие helper-модули из `supabase/functions/_shared/` для auth, CORS и HTTP-ответов.
