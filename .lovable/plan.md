

# Переименовать «Патент» → «РИД» с подтипами

## Суть
Аналогично тому, как «Грант» был объединён в «Проекты» с подтипами — категория «Патент» переименовывается в «РИД» (Результат интеллектуальной деятельности). Внутри появляется селектор подтипа РИД с указанием патентообладателя.

## Изменения

### 1. БД — миграция
- Добавить поле `rid_subtype` (text) в таблицы `unit_portfolio_items` и `contact_portfolio_items`
- Обновить существующие записи: `UPDATE ... SET rid_subtype = 'invention_patent' WHERE item_type = 'patent'`
- Переименовать `item_type = 'patent'` → `item_type = 'rid'` во всех существующих записях

### 2. `src/lib/labels.ts`
- В `portfolioTypeLabels`: заменить `patent: "Патент"` → `rid: "РИД"`
- Добавить словарь подтипов:
```text
ridSubtypeLabels = {
  invention_patent: "Патент на изобретение",
  utility_model: "Полезная модель",
  industrial_design: "Промышленный образец",
  software: "Программа для ЭВМ",
  database: "База данных",
  trademark: "Товарный знак",
  know_how: "Ноу-хау",
  other: "Другое"
}
```
- В `portfolioFieldConfig`: заменить ключ `patent` → `rid`, обновить labels:
  - `orgLabel` → «Правообладатель»
  - `yearFromLabel` → «Год регистрации»
  - `urlLabel` → «Номер / Ссылка»

### 3. `src/pages/UnitDetail.tsx` и `src/pages/UnitContactDetail.tsx`
- Заменить все ссылки на `patent` → `rid` в фильтрах, аккордеонах, заголовках
- В диалоге: показывать селектор «Тип РИД» (`rid_subtype`) когда `item_type === 'rid'` (аналогично подтипу проекта)
- В списке: показывать подтип бейджем рядом с названием
- Добавить `rid_subtype` в форму и запросы сохранения

### Затронутые файлы
- Миграция SQL (новое поле + переименование patent→rid + дефолтный подтип)
- `src/lib/labels.ts`
- `src/pages/UnitDetail.tsx`
- `src/pages/UnitContactDetail.tsx`

