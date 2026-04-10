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
- `SYNC_API_TOKEN` — (опционально) токен для внешнего бота

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
| `trigger-sync` | Внешний триггер синхронизации | ✅ или SYNC_API_TOKEN |

Все функции используют общие helper-модули из `supabase/functions/_shared/` для auth, CORS и HTTP-ответов.

---

## Интеграция с Google Sheets

### Общая схема

Система умеет экспортировать данные в Google Sheets и импортировать их обратно. Это позволяет внешним ботам и аналитикам работать с данными через таблицы.

### Настройка подключения

1. **Google Cloud**: создайте Service Account с доступом к Google Sheets API
2. **Google Sheets**: расшарьте таблицу на email сервисного аккаунта (Editor)
3. **Секреты**: добавьте `GOOGLE_SERVICE_ACCOUNT_KEY` (JSON ключ сервисного аккаунта)
4. **Админка**: зайдите в `/admin` → вкладка «Синхронизация» → введите Spreadsheet ID → включите синхронизацию

### Листы в таблице

| Лист | Таблица БД | Создание из Sheets |
|---|---|---|
| Partners | `partners` | ✅ через external_id |
| Contacts | `contacts` | ❌ только обновление |
| Needs | `partner_needs` | ❌ только обновление |
| Hypotheses | `collaboration_hypotheses` | ❌ только обновление |
| Units | `miem_units` | ✅ через external_id |
| Competencies | `competencies` | ❌ только обновление |
| Sources | `sources` | ❌ только обновление |
| Evidence | `evidence` | ❌ только обновление |
| NextSteps | `next_steps` | ❌ только обновление |
| UnitContacts | `unit_contacts` | ❌ только обновление |
| UnitMemberships | `unit_contact_memberships` | ❌ только обновление |

> **Руководитель коллектива** определяется через связь `miem_units.lead_contact_id` → `unit_contacts`, а не через текстовое поле `lead_name` (deprecated). Для назначения руководителя используйте `unit_contact_memberships.is_lead = true`.

### Создание новых записей из Sheets (external_id)

Для `partners` и `miem_units` можно создавать новые записи без знания внутренних UUID:

1. Оставьте колонку `partner_id` / `unit_id` **пустой**
2. Заполните `external_source` — идентификатор источника (например, `bot`, `crm`, `manual`)
3. Заполните `external_id` — уникальный ID записи в вашей системе

**Пример строки Partners:**
| partner_id | partner_name | external_source | external_id | industry |
|---|---|---|---|---|
| | Яндекс | bot | yandex-001 | IT |

При импорте:
- Если запись с таким `external_source + external_id` уже существует → она обновляется
- Если не существует → создаётся новая с новым UUID
- Дубликатов не будет

### Обязательные колонки для создания

- **Partners**: `partner_name`, `external_source`, `external_id`
- **Units**: `unit_name`, `external_source`, `external_id`

### Whitelist полей для импорта

При импорте обновляются **только бизнес-поля**. Системные поля (`created_at`, `updated_at`, `owner_user_id`) не затрагиваются.

### Запуск синхронизации для бота

#### Вариант 1: Machine token (рекомендуется для ботов)

1. Добавьте секрет `SYNC_API_TOKEN` с произвольным безопасным токеном
2. Вызовите Edge Function:

```bash
curl -X POST https://<project>.supabase.co/functions/v1/trigger-sync \
  -H "Authorization: Bearer <SYNC_API_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"action": "import"}'
```

#### Вариант 2: Admin token

```bash
curl -X POST https://<project>.supabase.co/functions/v1/trigger-sync \
  -H "Authorization: Bearer <admin_access_token>" \
  -H "Content-Type: application/json" \
  -d '{"action": "import", "tables": ["partners", "miem_units"]}'
```

#### Параметры запроса

| Поле | Тип | Описание |
|---|---|---|
| `action` | `"import"` \| `"export"` | По умолчанию `"import"` |
| `tables` | `string[]` | Список таблиц. Если пусто — берутся из настроек |

### Автоматическая синхронизация

В админке можно включить авто-синхронизацию с заданным интервалом. Для её работы нужно настроить cron job через pg_cron (ручной шаг, см. ниже).

### Журнал синхронизаций

Все синхронизации записываются в таблицу `sync_log`:
- Время начала и завершения
- Кто запустил (вручную / бот / API)
- Какие таблицы участвовали
- Статистика: создано, обновлено, пропущено, ошибки
- Детали ошибок по строкам

### Возможные ошибки

| Ошибка | Причина |
|---|---|
| `missing partner_id or external_source+external_id` | Строка без ID и без внешнего ключа |
| `partner_name is required for new partners` | Попытка создать партнёра без имени |
| `Sheet "Partners" not found` | Лист отсутствует в таблице |
| `Google Sheets API error` | Проблема с доступом к Google API |

### Ручные шаги

1. **Google Cloud Console**: создать Service Account, скачать JSON key
2. **Google Sheets**: расшарить таблицу сервисному аккаунту
3. **Секреты проекта**: добавить `GOOGLE_SERVICE_ACCOUNT_KEY`
4. **(Опционально)** Добавить `SYNC_API_TOKEN` для бота
5. **(Опционально)** Настроить pg_cron для автоматической синхронизации:

```sql
SELECT cron.schedule(
  'auto-sync-sheets',
  '0 * * * *',  -- каждый час
  $$
  SELECT net.http_post(
    url := '<SUPABASE_URL>/functions/v1/trigger-sync',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SYNC_API_TOKEN>"}'::jsonb,
    body := '{"action":"import"}'::jsonb
  );
  $$
);
```
