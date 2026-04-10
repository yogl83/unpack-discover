

# Исправление отправки писем при одобрении пользователя

## Проблема
Функция `approve-user` успешно одобряет пользователя, но письмо не отправляется. Причина: вызов `admin.functions.invoke("send-transactional-email")` из service-role клиента не проходит проверку JWT на gateway (`verify_jwt = true`). Ошибка проглатывается в `catch` блоке.

## Решение
Изменить `approve-user` (и аналогично `create-admin`), чтобы вызывать `send-transactional-email` напрямую через HTTP с service role key в заголовке Authorization — это корректно проходит gateway-проверку.

### Изменения

1. **`supabase/functions/approve-user/index.ts`** — заменить `admin.functions.invoke(...)` на прямой `fetch()` вызов с `Authorization: Bearer <service_role_key>`:
   ```ts
   const res = await fetch(
     `${Deno.env.get("SUPABASE_URL")}/functions/v1/send-transactional-email`,
     {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
       },
       body: JSON.stringify({ ... }),
     }
   );
   ```

2. **`supabase/functions/create-admin/index.ts`** — аналогичное изменение, если там тоже используется `admin.functions.invoke`.

3. **Передеплой** обеих функций.

4. **Повторный тест** — вызвать `approve-user` и проверить что запись появилась в `email_send_log`.

