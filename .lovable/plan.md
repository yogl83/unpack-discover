

# Комментарии пользователя и фактчекинг при перегенерации секций

## Что сейчас

Кнопка «Перегенерировать» у каждой секции вызывает `regenerateSection(sectionKey)` без каких-либо дополнительных параметров. Edge function получает только `partner_id`, `section_key`, `profile_id` и генерирует секцию с нуля, игнорируя результаты фактчекинга.

## Что нужно сделать

### 1. UI: поле комментария + кнопка (PartnerProfileTab.tsx)

Рядом с кнопкой «Перегенерировать» добавить:
- Текстовое поле (`Textarea`, 2 строки) с placeholder «Уточнения для AI: что добавить, убрать, исправить...»
- Комментарий передаётся в `regenerateSection(sectionKey, comment)`
- Состояние: `sectionComments: Record<string, string>` в useState

### 2. Передача фактчекинга в запрос (PartnerProfileTab.tsx)

При вызове `regenerateSection` собирать результаты фактчекинга для этой секции из `activeVerification` и передавать в body запроса:
```ts
body: { 
  partner_id, section_key, profile_id,
  user_comment: comment,         // новое
  fact_check_results: sectionVerification?.facts, // новое
  current_content: form[sectionKey]  // текущий текст секции
}
```

### 3. Edge function: использование комментария и фактчекинга (generate-partner-profile/index.ts)

В блоке `if (section_key && profile_id)` (строка ~538):
- Извлечь `user_comment`, `fact_check_results`, `current_content` из body
- Дополнить промт секции:
  - Если есть `current_content` — «Текущий текст секции: ...»
  - Если есть `fact_check_results` — «Результаты проверки фактов: ⚠️ неподтверждённые: ..., ❌ противоречия: ... — исправь или удали эти факты»
  - Если есть `user_comment` — «Дополнительные указания аналитика: ...»

## Файлы

| Файл | Действие |
|------|----------|
| `src/components/partner/PartnerProfileTab.tsx` | Добавить textarea для комментария, передать comment + fact_check + current_content в запрос |
| `supabase/functions/generate-partner-profile/index.ts` | Принять новые поля, дополнить промт перегенерации |

