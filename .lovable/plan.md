

# Русификация всех необработанных английских значений из БД

## Проблема

В нескольких местах UI английские значения из БД отображаются «как есть» без перевода. Маппинги уже существуют в `src/lib/labels.ts`, но не используются.

## Все найденные нестыковки

| Файл | Поле | Что видит пользователь | Маппинг |
|------|------|----------------------|---------|
| `InternalContacts.tsx:116` | `contact_role` | "lead", "researcher" | `memberRoleLabels` из labels.ts |
| `InternalContacts.tsx:78` | фильтр ролей | английские значения в dropdown | `memberRoleLabels` |
| `UnitDetail.tsx:436` | `contact_role` | "lead", "researcher" | `memberRoleLabels` |
| `PartnerDetail.tsx:527` | `contact_role` (unit_contacts) | "lead" | `memberRoleLabels` |
| `PartnerDetail.tsx:398` | `need_type` | "research", "development" | нужен новый `needTypeLabels` |
| `PartnerDetail.tsx:400` | `priority_level` | "low", "medium", "high" | `priorityLabels` из labels.ts |
| `Needs.tsx:68` | `need_type` | "research", "development" | нужен `needTypeLabels` |

## Решение

### 1. Добавить `needTypeLabels` в `src/lib/labels.ts`

```ts
export const needTypeLabels: Record<string, string> = {
  research: "Исследование", development: "Разработка",
  consulting: "Консалтинг", education: "Обучение", other: "Другое",
};
```

### 2. `src/pages/InternalContacts.tsx`
- Импортировать `memberRoleLabels`
- Строка 116: `{memberRoleLabels[c.contact_role] || c.contact_role || "—"}`
- Строка 78 (фильтр ролей): показывать русские названия в dropdown, фильтровать по ключу

### 3. `src/pages/UnitDetail.tsx`
- Строка 436: `{memberRoleLabels[c.contact_role] || c.contact_role || "—"}`

### 4. `src/pages/PartnerDetail.tsx`
- Импортировать `memberRoleLabels`, `needTypeLabels`, `priorityLabels`
- Строка 398: `{needTypeLabels[n.need_type] || n.need_type || "—"}`
- Строка 400: `{priorityLabels[n.priority_level] || n.priority_level || "—"}`
- Строка 527: `{memberRoleLabels[c.contact_role] || c.contact_role || "—"}`

### 5. `src/pages/Needs.tsx`
- Импортировать `needTypeLabels`
- Строка 68: `{needTypeLabels[n.need_type] || n.need_type || "—"}`

**Файлы для изменения:** `labels.ts`, `InternalContacts.tsx`, `UnitDetail.tsx`, `PartnerDetail.tsx`, `Needs.tsx`

