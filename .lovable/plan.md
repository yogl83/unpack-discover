

# Модуль Partner Profile — План реализации

## Обзор

Добавляем структурированный профайл компании как first-class сущность: две новые таблицы, storage bucket для файлов, вкладка "Профайл" в карточке партнёра, workflow (draft → review → approved → archived), миграция старых данных, подготовка к LLM-draft.

## Шаг 1. Миграция БД — таблицы и bucket

Одна SQL-миграция создаёт:

**Таблица `partner_profiles`** (30+ полей):
- `profile_id` uuid PK, `partner_id` uuid NOT NULL (FK → partners), `title` text
- Статус/версионирование: `status` (draft/review/approved/archived), `version_number` int default 1, `is_current` bool default false, `profile_date` date
- Тип: `profile_type` (manual/uploaded/hybrid/llm_draft), `source_type` (manual/upload/sheets/llm/external_bot)
- 11 секций контента: `summary_short`, `company_overview`, `business_scale`, `technology_focus`, `strategic_priorities`, `talent_needs`, `collaboration_opportunities`, `current_relationship_with_miem`, `relationship_with_other_universities`, `recent_news_and_plans`, `key_events_and_touchpoints`, `risks_and_constraints`, `recommended_next_steps`
- Метаданные: `references_json` jsonb, `change_summary`, `based_on_profile_id` uuid, `created_by`/`updated_by`/`approved_by` uuid, `approved_at`, timestamps
- LLM-ready (Phase 2): `generation_status`, `generated_from_prompt`, `generated_from_sources_json` jsonb, `needs_human_review` bool, `last_generated_at`
- Индексы: `partner_id`, `status`, `is_current`, `profile_date`
- Constraint: unique partial index `(partner_id) WHERE is_current = true AND status = 'approved'` — один current approved на партнёра

**Таблица `partner_profile_files`**:
- `file_id` uuid PK, `profile_id` uuid FK, `partner_id` uuid FK
- `storage_bucket` text default 'partner-profile-files', `storage_path` text NOT NULL
- `original_filename`, `mime_type`, `file_size` bigint, `uploaded_by` uuid
- `is_source_document` bool default true, `notes`, `created_at`

**Storage bucket**: `partner-profile-files` (private)

**RLS-политики** (используя существующий `has_role()`):
- `partner_profiles` SELECT: all authenticated; INSERT/UPDATE: admin + analyst; DELETE: admin only
- `partner_profile_files` SELECT: all authenticated; INSERT/UPDATE: admin + analyst; DELETE: admin only
- Storage `partner-profile-files`: authenticated upload (admin/analyst), authenticated read

**Миграция данных**: для каждого партнёра с заполненным `company_profile` / `technology_profile` / `strategic_priorities` создаётся initial profile (status=approved, is_current=true, profile_type=manual, source_type=manual)

## Шаг 2. UI — компонент PartnerProfileTab

Новый файл `src/components/partner/PartnerProfileTab.tsx` (~400 строк):

**Режим просмотра** (current approved profile):
- Заголовок с badge статуса, версией, датой, автором
- Секции профайла в карточках (Accordion или Cards)
- Список прикреплённых файлов с кнопкой скачивания
- Profile freshness indicator: цветной badge (нет профайла / draft / устарел / актуален)

**Режим редактирования** (для analyst/admin):
- Кнопка "Создать новый профайл" / "Редактировать draft"
- Форма с секциями (каждая секция — Textarea)
- Upload файлов (drag & drop или кнопка)
- Кнопки workflow: "Сохранить черновик", "На рассмотрение" (analyst), "Утвердить" / "Архивировать" (admin)

**История версий**:
- Таблица прошлых версий (версия, статус, дата, автор)

## Шаг 3. Интеграция в PartnerDetail

В `src/pages/PartnerDetail.tsx`:
- Новая вкладка "Профайл" с иконкой FileText между "Информация" и "Контакты"
- Badge с freshness-индикатором на вкладке
- Старые поля `company_profile`, `technology_profile`, `strategic_priorities` в Info tab остаются read-only с пометкой "Перенесено в Профайл" (fallback, если профайл ещё не создан — показываем старые данные)

## Шаг 4. Profile Freshness в списке Partners

В `src/pages/Partners.tsx` — новая колонка "Профайл" с цветным индикатором:
- Серый: нет профайла
- Жёлтый: только draft
- Зелёный: approved и актуален (< 90 дней)
- Оранжевый: approved, но устарел (> 90 дней)

Для этого потребуется обновить view `partner_overview` или добавить join.

## Файлы

| Файл | Действие |
|------|----------|
| Миграция SQL | Создать — 2 таблицы, bucket, RLS, индексы, data migration |
| `src/components/partner/PartnerProfileTab.tsx` | Создать — основной UI профайла |
| `src/components/partner/ProfileFileUpload.tsx` | Создать — компонент загрузки файлов |
| `src/components/partner/ProfileFreshnessBadge.tsx` | Создать — индикатор актуальности |
| `src/pages/PartnerDetail.tsx` | Изменить — добавить вкладку Профайл |
| `src/pages/Partners.tsx` | Изменить — добавить колонку freshness |

## Что готово для Phase 2 (LLM)

- Поля `generation_status`, `generated_from_prompt`, `generated_from_sources_json`, `needs_human_review`, `last_generated_at` уже в таблице
- `profile_type = 'llm_draft'` и `source_type = 'llm'` уже в enum
- `based_on_profile_id` для цепочки версий
- Section-level provenance можно добавить позже через отдельную таблицу `partner_profile_sections` без изменения текущей схемы

## Что НЕ меняется

- Google Sheets sync — не затрагивается
- Auth / roles / bootstrap — без изменений
- Существующие таблицы — не модифицируются (поля в `partners` остаются для обратной совместимости)

