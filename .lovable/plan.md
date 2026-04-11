

# Улучшение отображения таблиц в профайле

## Проблема

Markdown-таблицы рендерятся через `react-markdown` + `remarkGfm` внутри `prose prose-sm`, но не имеют стилей для границ, padding и ширины — выглядят как сплошной текст без визуального разделения ячеек.

## Решение

Добавить кастомные компоненты `table`, `th`, `td` в `ReactMarkdown.components` в `PartnerProfileTab.tsx`, а также аналогичные стили для PDF-экспорта (там уже используется `jspdf-autotable`, так что PDF в порядке).

### Что будет сделано

**`src/components/partner/PartnerProfileTab.tsx`** — добавить в `components` prop `ReactMarkdown`:

```tsx
table: ({ children }) => (
  <div className="overflow-x-auto my-2">
    <table className="w-full text-sm border-collapse border border-border rounded">
      {children}
    </table>
  </div>
),
thead: ({ children }) => (
  <thead className="bg-muted/50">{children}</thead>
),
th: ({ children }) => (
  <th className="border border-border px-3 py-2 text-left font-medium text-xs">{children}</th>
),
td: ({ children }) => (
  <td className="border border-border px-3 py-2 text-xs">{children}</td>
),
```

Таблицы получат чёткие границы, фон заголовков, горизонтальный скролл на узких экранах.

### Файлы

| Файл | Действие |
|------|----------|
| `src/components/partner/PartnerProfileTab.tsx` | Добавить table/th/td компоненты в ReactMarkdown |

