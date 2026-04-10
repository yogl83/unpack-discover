# Chunk 1 — повторная фиксация `miem_units` sync в рабочей ревизии

Что я уже проверил по текущему snapshot:

- В `supabase/functions/sync-google-sheets/index.ts` блок `miem_units` сейчас выглядит так:
  - `columns`: содержит `lead_contact_id`
  - `importableColumns`: содержит `lead_contact_id`
  - `lead_name` в этом конфиге не видно
- По поиску по файлу есть только:
  - `table: "miem_units"` и строки с `lead_contact_id`
  - упоминание `miem_units` в валидации `unit_name`
  - `lead_name` по этому snapshot не найден

Но ваш критерий приёмки требует факт именно из текущей рабочей ревизии/HEAD, плюс точный diff и вывод `rg`. В read-only режиме я не могу ни зафиксировать изменение, ни отдать реальный commit hash, ни выполнить команду.

## Что сделаю после переключения в режим правок

1. Открою `supabase/functions/sync-google-sheets/index.ts` именно в рабочей ревизии HEAD.
2. Если в `miem_units` там ещё есть `lead_name`:
  - удалю `lead_name` из `columns`
  - удалю `lead_name` из `importableColumns`
  - добавлю `lead_contact_id` в `columns`
  - добавлю `lead_contact_id` в `importableColumns`
3. Не буду трогать другие `TABLE_CONFIGS` и не менять архитектуру функции.
4. Сразу после этого сниму факт:
  - commit hash
  - точный diff только по `supabase/functions/sync-google-sheets/index.ts`
  - вывод команды  
  `rg -n "miem_units|lead_name|lead_contact_id" supabase/functions/sync-google-sheets/index.ts`
5. Если окажется, что рабочая ревизия уже совпадает с требованием:
  - честно верну no-op diff
  - приложу фактический `rg`
  - отдельно отмечу, что Chunk 1 уже закрыт в HEAD без дополнительной правки

## Ожидаемый критерий результата

- Для `miem_units` в файле не будет `lead_name` в `columns/importableColumns`
- Для `miem_units` будет `lead_contact_id` в `columns/importableColumns`
- Остальные `TABLE_CONFIGS` останутся без функциональных изменений
- В ответе будут именно те артефакты, которые вы запросили: hash, diff, `rg`