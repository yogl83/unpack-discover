

## Добавление русских подписей для типов коллективов

### Проблема
В таблице списка коллективов (`/units`) поле `unit_type` отображается как есть из БД — например, "department" вместо "Департамент".

### Решение

**1. Добавить маппинг в `src/lib/labels.ts`**
Добавить `unitTypeLabels` на основе значений из `UnitDetail.tsx`:

```ts
export const unitTypeLabels: Record<string, string> = {
  lab: "Лаборатория",
  project_group: "Проектная группа",
  center: "Центр",
  department: "Департамент",
};
```

**2. Использовать в `src/pages/Units.tsx`**
Импортировать `unitTypeLabels` и применить к отображению:

```tsx
import { unitTypeLabels } from "@/lib/labels";
// ...
<TableCell>{unitTypeLabels[u.unit_type] || u.unit_type || "—"}</TableCell>
```

**Файлы для изменения:**
- `src/lib/labels.ts` — добавить маппинг
- `src/pages/Units.tsx` — использовать маппинг при отображении типа

