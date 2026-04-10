

# Нормализация sync: убрать lead_name, добавить unit_contacts/memberships

## Изменения

### 1. `supabase/functions/sync-google-sheets/index.ts`

**miem_units** — убрать `lead_name` из `columns` и `importableColumns` (строки 87-88). Добавить `lead_contact_id` в `columns` (read-only при экспорте, не в importableColumns).

**Новые TABLE_CONFIGS** — добавить после `next_steps`:

```
unit_contacts: sheetName "UnitContacts", idColumn "unit_contact_id",
  columns: [unit_contact_id, unit_id, full_name, job_title, email, phone, telegram, contact_role, is_primary, availability_notes, notes],
  importableColumns: [unit_id, full_name, job_title, email, phone, telegram, contact_role, is_primary, availability_notes, notes],
  supportsExternalCreate: false

unit_contact_memberships: sheetName "UnitMemberships", idColumn "membership_id",
  columns: [membership_id, unit_id, unit_contact_id, member_role, is_lead, is_primary, sort_order, notes],
  importableColumns: [unit_id, unit_contact_id, member_role, is_lead, is_primary, sort_order, notes],
  supportsExternalCreate: false
```

**parseValue** — добавить `is_lead` к булевым полям, `sort_order` к числовым.

### 2. `src/components/AdminSync.tsx` (строки 17-27)

Добавить в `TABLES`:
```
{ key: "unit_contacts", label: "Внутренние контакты", external: false }
{ key: "unit_contact_memberships", label: "Состав коллективов", external: false }
```

### 3. `src/components/GoogleSheetsSync.tsx` (строки 14-22)

Добавить в `TABLES`:
```
{ key: "unit_contacts", label: "Внутренние контакты" }
{ key: "unit_contact_memberships", label: "Состав коллективов" }
```

### 4. `README.md`

- Убрать `lead_name` из примеров и описания miem_units
- Добавить строки в таблицу листов: `UnitContacts` → `unit_contacts` (update-only), `UnitMemberships` → `unit_contact_memberships` (update-only)
- Обновить раздел "Обязательные колонки для создания" — убрать упоминание `lead_name`, добавить пояснение что руководитель назначается через `unit_contact_memberships.is_lead`
- Добавить note: "Руководитель коллектива определяется через связь `lead_contact_id` → `unit_contacts`, а не через текстовое поле"

## Backward compatibility

- `lead_name` остаётся в БД как legacy-колонка, просто не участвует в sync
- Если в Google Sheet остался столбец `lead_name`, он будет проигнорирован (не в columns → пропускается)
- Существующие листы не ломаются — новые листы создаются автоматически при экспорте

## Риски

- Если у кого-то бот пишет `lead_name` в Sheet для импорта — поле перестанет обновляться. Смягчение: это ожидаемое поведение, `lead_name` — deprecated
- Новые листы `UnitContacts`/`UnitMemberships` будут пустыми до первого экспорта

## Файлы

| Файл | Действие |
|------|----------|
| `supabase/functions/sync-google-sheets/index.ts` | Убрать lead_name, добавить 2 таблицы |
| `src/components/AdminSync.tsx` | +2 записи в TABLES |
| `src/components/GoogleSheetsSync.tsx` | +2 записи в TABLES |
| `README.md` | Обновить документацию |

