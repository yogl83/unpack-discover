

# WYSIWYG-редактор вместо split-view

## Текущее состояние

Сейчас в edit mode каждая секция показывает два столбца: слева textarea с raw markdown, справа — отрендеренный предпросмотр. Это занимает много места и заставляет работать с сырым markdown.

## Предложение

Заменить split-view на WYSIWYG-редактор, где пользователь видит и редактирует уже отформатированный текст — таблицы, ссылки, списки, жирный/курсив — без raw markdown.

## Технические варианты

**Tiptap** (рекомендуемый) — headless rich-text editor на ProseMirror. Поддерживает markdown-import/export, таблицы, ссылки. Хорошо интегрируется с React и Tailwind.

- Импорт: markdown → Tiptap при открытии секции (через `tiptap-markdown` extension)
- Экспорт: Tiptap → markdown при сохранении (формат БД не меняется)
- Таблицы, bold, italic, списки, ссылки — всё визуально

## Что будет сделано

### Шаг 1: Установить зависимости
`@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/extension-link`, `tiptap-markdown`

### Шаг 2: Компонент `MarkdownWysiwyg`
**`src/components/partner/MarkdownWysiwyg.tsx`** — переиспользуемый компонент:
- Принимает `value` (markdown string), `onChange` (markdown string)
- Конвертирует md → Tiptap при mount, Tiptap → md при изменениях
- Toolbar: bold, italic, bullet list, table actions
- Стилизация: те же `prose prose-sm` + border как в текущем preview

### Шаг 3: Заменить textarea + preview в `PartnerProfileTab.tsx`
- Вместо `grid-cols-2` с textarea + ReactMarkdown → один `MarkdownWysiwyg`
- AI-сгенерированные секции подсвечиваются синей рамкой (как сейчас)
- Accordion, progress, sticky sources — остаются без изменений

## Файлы

| Файл | Действие |
|------|----------|
| `src/components/partner/MarkdownWysiwyg.tsx` | Новый компонент WYSIWYG на Tiptap |
| `src/components/partner/PartnerProfileTab.tsx` | Заменить textarea+preview на MarkdownWysiwyg |
| `package.json` | Добавить tiptap зависимости |

