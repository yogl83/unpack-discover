

# Синхронизация настроек AI + экспорт профайла в PDF

## Проблемы сейчас

1. **AdminAISettings** содержит 13 секций по умолчанию (включая 5 удалённых: `talent_needs`, `collaboration_opportunities`, `current_relationship_with_miem`, `risks_and_constraints`, `recommended_next_steps`)
2. Системный промт по умолчанию ссылается на `collaboration_opportunities` — удалённую секцию
3. Edge function `generate-partner-profile` в user prompt говорит «Заполни все 13 секций» вместо 8
4. Нет экспорта профайла в PDF

## Что будет сделано

### 1. Синхронизация AdminAISettings с актуальной схемой

**`src/components/AdminAISettings.tsx`**:
- Убрать 5 удалённых секций из `DEFAULT_SECTIONS` (оставить 8)
- Убрать упоминание `collaboration_opportunities` из `DEFAULT_SYSTEM_PROMPT`

### 2. Исправить user prompt в edge function

**`supabase/functions/generate-partner-profile/index.ts`**:
- Строка 220: заменить «13 секций» на динамическое `${sections.length} секций`

### 3. Экспорт профайла в PDF

**Новый файл `src/components/partner/ProfilePdfExport.tsx`**:
- Кнопка «Скачать PDF» в шапке профайла (рядом с «История»)
- Генерирует PDF на клиенте через `jspdf` + `jspdf-autotable`
- Содержит: название партнёра, дату, все заполненные секции, источники
- Markdown-таблицы конвертируются в PDF-таблицы
- Русский текст через встроенный Unicode-шрифт

**`package.json`**: добавить `jspdf`, `jspdf-autotable`

**`src/components/partner/PartnerProfileTab.tsx`**: добавить кнопку PDF-экспорта

## Файлы

| Файл | Действие |
|------|----------|
| `src/components/AdminAISettings.tsx` | Убрать 5 секций из DEFAULT_SECTIONS, обновить промт |
| `supabase/functions/generate-partner-profile/index.ts` | Динамическое число секций в промте |
| `src/components/partner/ProfilePdfExport.tsx` | Новый компонент экспорта |
| `src/components/partner/PartnerProfileTab.tsx` | Кнопка PDF |
| `package.json` | jspdf, jspdf-autotable |

