

# План: переход от lead_name к lead_contact_id — production-ready

## 1. Текущее состояние

Sync edge function (`sync-google-sheets/index.ts`) уже содержит `unit_contacts` и `unit_contact_memberships` в TABLE_CONFIGS, и `lead_name` уже убран из columns/importableColumns для `miem_units` (заменён на `lead_contact_id` в columns, но не в importableColumns). AdminSync и GoogleSheetsSync UI уже показывают эти таблицы. Т.е. часть работы сделана в предыдущих итерациях.

**Остающиеся проблемы:**

1. **unit_overview view** — всё ещё использует `u.lead_name` вместо join на `unit_contacts` через `lead_contact_id`
2. **Units.tsx** — отображает `u.lead_name` из view
3. **UnitDetail.tsx** — форма содержит `lead_name` в state, fallback на `form.lead_name` в placeholder Select и в Input для нового коллектива
4. **README.md** — таблица листов не включает UnitContacts/UnitMemberships, упоминает `lead_name` в описании
5. **GoogleSheetsSync.tsx** — уже содержит новые таблицы, OK
6. **AdminSync.tsx** — уже содержит новые таблицы, OK
7. **Sync edge function** — `lead_contact_id` есть в columns (экспорт), но нет в importableColumns (нельзя импортировать назначение руководителя) — это может быть намеренно или нет

## 2. Plan (пошагово)

### Step 1: Migration — обновить view `unit_overview`
Новая миграция: drop + recreate `unit_overview` с JOIN на `unit_contacts` через `lead_contact_id`, выводя `uc.full_name as lead_name` для обратной совместимости с UI.

```sql
DROP VIEW IF EXISTS public.unit_overview;
CREATE VIEW public.unit_overview WITH (security_invoker = on) AS
SELECT
  u.unit_id, u.unit_name, u.unit_type,
  u.research_area, u.readiness_level,
  uc.full_name AS lead_name,
  COUNT(DISTINCT c.competency_id) AS competencies_count,
  COUNT(DISTINCT h.hypothesis_id) AS linked_hypotheses_count
FROM public.miem_units u
LEFT JOIN public.unit_contacts uc ON uc.unit_contact_id = u.lead_contact_id
LEFT JOIN public.competencies c ON c.unit_id = u.unit_id
LEFT JOIN public.collaboration_hypotheses h ON h.unit_id = u.unit_id
GROUP BY u.unit_id, uc.full_name;
```

Это сохраняет колонку `lead_name` в view (вычисляемую из контакта), поэтому Units.tsx продолжает работать без изменений. Types перегенерируются автоматически.

### Step 2: UnitDetail.tsx — убрать lead_name из формы
- Убрать `lead_name` из объекта `form` state
- Убрать `lead_name` из payload при save (оно deprecated в таблице)
- В fallback для новых коллективов (когда нет контактов) показывать disabled placeholder вместо input для `lead_name`
- Убрать `form.lead_name` из placeholder Select

### Step 3: sync-google-sheets — добавить lead_contact_id в importableColumns
Добавить `lead_contact_id` в importableColumns для `miem_units`, чтобы через импорт можно было назначить руководителя (если UUID контакта известен).

### Step 4: README.md — актуализировать
- Добавить UnitContacts и UnitMemberships в таблицу листов
- Убрать упоминание `lead_name` как рабочего поля
- Описать что руководитель задаётся через `lead_contact_id`

### Step 5: Lint/Build проверка

## 3. Файлы и изменения

| Файл | Что |
|------|-----|
| `supabase/migrations/new.sql` | Пересоздать `unit_overview` view с JOIN на unit_contacts |
| `src/pages/UnitDetail.tsx` | Убрать `lead_name` из form state и save payload |
| `supabase/functions/sync-google-sheets/index.ts` | Добавить `lead_contact_id` в importableColumns для miem_units |
| `README.md` | Актуализировать раздел Google Sheets |

## 4. Риски

- **View recreation**: может потребовать пересборку типов. Lovable Cloud делает это автоматически.
- **lead_name column в miem_units**: остаётся в таблице (deprecated), не удаляем для обратной совместимости. View теперь вычисляет его из join.
- **Импорт lead_contact_id**: требует знания UUID контакта. Это корректно для machine-to-machine синка.

