

# План: Управление пользователями + Google Sheets синхронизация

## Что делаем

1. **Страница управления пользователями** (`/users`) — список всех пользователей с ролями, возможность админу менять роли
2. **Автоподтверждение email** — чтобы можно было сразу входить без проверки почты
3. **Создание тестового admin-аккаунта** — для первого входа
4. **CRUD-формы для всех сущностей** — замена placeholder-страниц рабочими списками с формами (задачи, гипотезы, шаги, коллективы, компетенции, источники, подтверждения)
5. **Google Sheets синхронизация** — edge function для экспорта/импорта данных в Google Sheets (только для admin)

## Этапы

### 1. Включить автоподтверждение email
Использовать `configure_auth` для включения auto-confirm, чтобы тестовые пользователи могли входить сразу.

### 2. Создать тестового admin-пользователя
- Зарегистрировать пользователя `admin@hse.ru` / `admin123`
- Назначить роль `admin` через insert в `user_roles`

### 3. Страница управления пользователями (`/users`)
- Таблица: ФИО, Email, Роль, Дата регистрации
- Админ может менять роль пользователя (dropdown: admin / analyst / viewer)
- Админ может удалять пользователей
- Не-админы видят только список без возможности редактирования

### 4. CRUD-страницы для всех сущностей
Для каждой из 7 оставшихся сущностей (needs, hypotheses, next-steps, units, competencies, sources, evidence):
- Страница-список с поиском и фильтрами
- Карточка создания/редактирования с формой
- Роли: viewer — только просмотр, analyst — CRUD, admin — CRUD + удаление

Файлы:
- `src/pages/Needs.tsx` + `src/pages/NeedDetail.tsx`
- `src/pages/Hypotheses.tsx` + `src/pages/HypothesisDetail.tsx`
- `src/pages/NextSteps.tsx` + `src/pages/NextStepDetail.tsx`
- `src/pages/Units.tsx` + `src/pages/UnitDetail.tsx`
- `src/pages/Competencies.tsx` + `src/pages/CompetencyDetail.tsx`
- `src/pages/Sources.tsx` + `src/pages/SourceDetail.tsx`
- `src/pages/Evidence.tsx` + `src/pages/EvidenceDetail.tsx`
- `src/pages/Users.tsx`

Обновить роутинг в `src/App.tsx` для всех новых страниц.

### 5. Google Sheets синхронизация (admin only)
- Подключить Google connector через `standard_connectors--connect`
- Создать edge function `sync-google-sheets`:
  - POST `/export` — выгрузить таблицу partners (и др.) в указанный Google Sheet
  - POST `/import` — загрузить данные из Google Sheet в БД
- Кнопка «Синхронизация с Google Sheets» на странице `/users` или в header (видна только admin)
- Диалог с выбором: экспорт / импорт, указание Sheet ID

## Технические детали

- Роли уже настроены в БД: `user_roles` + `has_role()` + RLS
- Все таблицы уже созданы с корректными RLS-политиками
- Типы автогенерированы в `types.ts`
- Google Sheets API будет проксироваться через connector gateway
- Edge function будет использовать service role key для записи в БД при импорте

