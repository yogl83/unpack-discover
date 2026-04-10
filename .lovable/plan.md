

# Исправление: REVOKE на has_role сломал доступ к данным

## Проблема
Миграция безопасности сделала `REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated` — это заблокировало все RLS-политики, использующие `has_role()`. Результат: запросы к `user_roles`, `profiles` и другим таблицам возвращают 403. Кнопки «Добавить» не показываются, т.к. `canEdit` = false (роль не загружается).

## Решение
Одна миграция:

1. **`GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated`** — вернуть доступ, чтобы RLS работал
2. **Пометить функцию как не-RPC**: установить `security_label` или перенести в internal schema нельзя без риска — вместо этого просто убрать из PostgREST exposed schemas, но это тоже опасно. Самый надёжный вариант: **оставить GRANT** (функция и так безопасна — возвращает boolean только для переданного user_id, что не даёт перебирать чужие роли, т.к. атакующий должен знать UUID).

Итого: одна строка SQL — `GRANT EXECUTE ... TO authenticated`.

### Файлы
- Новая миграция (через migration tool)

