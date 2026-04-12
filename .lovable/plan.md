

# Объединить «Проекты» и «Гранты» + подтип проекта

## Суть
Убрать отдельную категорию «Грант» из портфолио. Все гранты становятся проектами. Внутри проекта появляется селектор **«Тип проекта»**: Грант, Заказная разработка, Стартап, Инициативный проект, Другое.

## Изменения

### 1. БД — миграция
- Добавить поле `project_subtype` (text) в таблицы `unit_portfolio_items` и `contact_portfolio_items`
- Обновить существующие записи: `UPDATE ... SET item_type = 'project', project_subtype = 'grant' WHERE item_type = 'grant'`

### 2. `src/lib/labels.ts`
- Удалить `grant` из `portfolioTypeLabels` (останется: project, publication, patent, product, other)
- Удалить `grant` из `portfolioFieldConfig`
- Обновить `project.orgLabel` → «Организация / Фонд» (универсальный для грантов и заказных)
- Добавить словарь подтипов проектов:
```text
projectSubtypeLabels = {
  grant: "Грант",
  contract: "Заказная разработка",
  startup: "Стартап",
  initiative: "Инициативный проект",
  other: "Другое"
}
```

### 3. `src/pages/UnitDetail.tsx` и `src/pages/UnitContactDetail.tsx`
- В диалоге добавления/редактирования проекта: показывать селектор «Тип проекта» (project_subtype) только когда `item_type === 'project'`
- Добавить `project_subtype` в форму, запросы сохранения и загрузки
- В списке проектов: показывать подтип бейджем рядом с названием

### Затронутые файлы
- Миграция SQL (новое поле + миграция данных grant→project)
- `src/lib/labels.ts`
- `src/pages/UnitDetail.tsx`
- `src/pages/UnitContactDetail.tsx`

