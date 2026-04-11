

# Синхронизация промтов: edge function ← AdminAISettings

## Проблема

Edge function `generate-partner-profile/index.ts` содержит **старые короткие промты** для секций (строки 51-59), например `"Напиши 2-3 предложения."` вместо детальных инструкций из `AdminAISettings.tsx`. Также в системном промте edge function есть строка про `collaboration_opportunities` и `strategic_priorities` с рекомендациями, которых не должно быть.

Эти дефолты используются когда в БД нет сохранённых настроек — то есть практически всегда при первом запуске.

## Решение

Скопировать детальные промты из `AdminAISettings.tsx` (строки 51-59) в edge function (строки 51-59), чтобы дефолты были идентичны. Убрать строку про `collaboration_opportunities` из системного промта edge function (строка 39).

## Изменения

| Файл | Действие |
|------|----------|
| `supabase/functions/generate-partner-profile/index.ts` | Заменить DEFAULT_SECTIONS (строки 51-59) на детальные промты из AdminAISettings; убрать строку 39 про strategic_priorities/collaboration_opportunities |

