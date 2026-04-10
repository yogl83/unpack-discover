

# Что ещё можно улучшить

## Итог: 5 практичных улучшений

### 1. Пагинация на списковых страницах
Все списки (Partners, Needs, Hypotheses, NextSteps, Units, Competencies, ExternalContacts, InternalContacts) загружают **все записи** без лимита. При росте данных это упрётся в лимит Supabase (1000 строк) и замедлит UI.

**Решение:** Добавить серверную пагинацию через `.range()` + компонент `Pagination` из shadcn/ui. Шаблон: 25 записей на страницу, `?page=N` в URL.

**Файлы:** Partners.tsx, Needs.tsx, Hypotheses.tsx, NextSteps.tsx, Units.tsx, Competencies.tsx, ExternalContacts.tsx, InternalContacts.tsx

### 2. Debounce поиска
Каждый keystroke в поле поиска вызывает новый запрос к БД. На медленном соединении — лаг и лишняя нагрузка.

**Решение:** Хук `useDebounce(search, 300)` — один общий, используется во всех списках.

**Файлы:** новый `src/hooks/useDebounce.ts`, все списковые страницы

### 3. Предупреждение о несохранённых изменениях
На всех detail-страницах (PartnerDetail, HypothesisDetail, NeedDetail, и т.д.) можно уйти с формы без сохранения — данные теряются молча.

**Решение:** Хук `useUnsavedChanges(isDirty)` с `beforeunload` + react-router `useBlocker` для внутренней навигации. Показывает ConfirmDialog при попытке уйти.

**Файлы:** новый `src/hooks/useUnsavedChanges.ts`, все detail-страницы

### 4. Мелкая чистка
- Убрать неиспользуемые импорты `FileText`, `ShieldCheck` из AppSidebar.tsx
- Удалить Placeholder.tsx — он нигде не импортируется
- Убрать `sources`/`evidence` из `Placeholder.tsx` titles (если ещё остались)

### 5. Мобильная адаптация таблиц
На 390px таблицы с 6-9 колонками требуют горизонтального скролла, что неудобно. Можно скрыть второстепенные колонки через `hidden md:table-cell` или переключить на card-layout на мобильных.

**Решение:** Для приоритетных списков (Partners, Needs) — скрывать 2-3 колонки на `< md`, показывать ключевые (название, статус).

**Файлы:** Partners.tsx, Needs.tsx, Hypotheses.tsx, NextSteps.tsx

---

## Приоритет реализации

| # | Что | Усилие |
|---|-----|--------|
| 1 | Пагинация | Среднее (8 файлов, но паттерн один) |
| 2 | Debounce | Малое |
| 3 | Unsaved changes | Среднее |
| 4 | Чистка мёртвого кода | Малое |
| 5 | Мобильная адаптация | Среднее |

Предлагаю начать с **1 + 2 + 4** в одном чанке (пагинация, debounce, чистка), затем **3** (unsaved changes), затем **5** (мобильная адаптация).

