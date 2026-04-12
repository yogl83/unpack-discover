

# Портфолио коллектива — по аналогии с профайлом организации

## Текущее состояние
Вкладка «Портфолио» — плоская таблица со всеми элементами вперемешку. Нет общего описания, нет группировки по типам, нет загрузки файлов.

## Предлагаемая структура вкладки

```text
┌─────────────────────────────────────────────┐
│  Достижения и результаты группы             │
│  [Markdown-текстовое поле с обзором]        │
├─────────────────────────────────────────────┤
│  ▼ Проекты (3)                    [+ Добавить] │
│    • Проект А — Компания X, 2022–2024       │
│    • Проект Б — Компания Y, 2023–н.в.       │
│  ▼ Публикации (2)                 [+ Добавить] │
│    • Статья 1 — Журнал Z, 2023              │
│  ▼ Патенты (0)                    [+ Добавить] │
│    Нет элементов                            │
│  ▼ Гранты (1)                     [+ Добавить] │
│  ▼ Продукты (0)                   [+ Добавить] │
│  ▼ Другое (0)                     [+ Добавить] │
├─────────────────────────────────────────────┤
│  Файлы                            [Загрузить] │
│    📄 Отчёт_2024.pdf  (1.2 MB)   ⬇ 🗑      │
└─────────────────────────────────────────────┘
```

## Изменения

### 1. БД — миграция
- Добавить поле `portfolio_summary` (text) в таблицу `miem_units` — общее описание достижений
- Создать таблицу `unit_portfolio_files` (file_id, unit_id, storage_path, original_filename, mime_type, file_size, uploaded_by, created_at) с RLS
- Создать storage bucket `unit-portfolio-files` (private)

### 2. UI — переработка вкладки Портфолио
- Вверху — Markdown-поле `portfolio_summary` (редактируемый текст с описанием заслуг группы), используя существующий компонент `MarkdownWysiwyg`
- Ниже — Accordion-секции по типам (project, publication, patent, grant, product, other), каждая с кнопкой «Добавить» и списком карточек
- Каждая карточка — компактный блок с названием, организацией, периодом, ссылкой, кнопками редактирования/удаления
- Внизу — блок загрузки файлов (по аналогии с `ProfileFileUpload`)

### 3. Компонент файлов
- Создать `src/components/unit/UnitPortfolioFiles.tsx` — аналог `ProfileFileUpload`, но для unit_portfolio_files и bucket `unit-portfolio-files`

## Технические детали

**Миграция SQL:**
```sql
ALTER TABLE miem_units ADD COLUMN portfolio_summary text;

CREATE TABLE unit_portfolio_files (
  file_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  mime_type text,
  file_size bigint,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE unit_portfolio_files ENABLE ROW LEVEL SECURITY;
-- RLS policies analogous to unit_portfolio_items

INSERT INTO storage.buckets (id, name, public) VALUES ('unit-portfolio-files', 'unit-portfolio-files', false);
-- Storage RLS policies for authenticated users
```

**Файлы для изменения:**
- `src/pages/UnitDetail.tsx` — переработка вкладки Портфолио
- `src/components/unit/UnitPortfolioFiles.tsx` — новый компонент загрузки файлов
- Миграция для `portfolio_summary`, `unit_portfolio_files`, storage bucket

