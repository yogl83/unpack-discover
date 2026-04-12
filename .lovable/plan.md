

# Прикрепление файлов к элементам портфолио

## Проблема
Сейчас файлы прикрепляются только к подразделению целиком (`unit_portfolio_files`). Нужна возможность прикрепить файлы к конкретному элементу портфолио — публикации, РИД, проекту, продукту и т.д.

## Решение

### 1. БД — миграция
Создать таблицу `portfolio_item_files`:
- `file_id` (uuid, PK)
- `portfolio_item_id` (uuid, NOT NULL) — ссылка на `unit_portfolio_items` или `contact_portfolio_items`
- `item_source` (text, NOT NULL, default 'unit') — 'unit' или 'contact', чтобы различать источник
- `storage_path` (text, NOT NULL)
- `original_filename` (text, NOT NULL)
- `mime_type` (text)
- `file_size` (bigint)
- `uploaded_by` (uuid)
- `created_at` (timestamptz, default now())

RLS: аналогично остальным таблицам (admin/analyst insert/update, admin delete, authenticated select).

Бакет `unit-portfolio-files` уже существует — использовать его же.

### 2. Компонент `PortfolioItemFiles`
Создать `src/components/unit/PortfolioItemFiles.tsx` — переиспользуемый компонент:
- Props: `portfolioItemId`, `itemSource` ('unit'|'contact'), `editable`
- Загрузка, скачивание, удаление файлов (аналогично `UnitPortfolioFiles`, но привязка к конкретному элементу)
- Компактный вид: иконки файлов в строку + кнопка «Прикрепить»

### 3. UI — встроить в карточки портфолио
В `UnitDetail.tsx` и `UnitContactDetail.tsx`:
- Внутри каждого элемента портфолио (div с border) добавить `<PortfolioItemFiles>` под описанием
- Показывает прикреплённые файлы и кнопку загрузки (если editable)

### Затронутые файлы
- Миграция SQL (новая таблица + RLS)
- `src/components/unit/PortfolioItemFiles.tsx` (новый)
- `src/pages/UnitDetail.tsx` — встроить компонент в список элементов
- `src/pages/UnitContactDetail.tsx` — аналогично

