

# Уведомление админов о новых заявках на регистрацию

## Проблема
При регистрации нового пользователя админы не получают email-уведомление. Они узнают о заявках только при ручном заходе на страницу /admin.

## Решение

### 1. Создать шаблон `new-registration-request` 
**Файл:** `supabase/functions/_shared/transactional-email-templates/new-registration-request.tsx`

Письмо для админов с информацией: ФИО, email заявителя, ссылка на страницу администрирования.

### 2. Зарегистрировать шаблон в `registry.ts`
Добавить импорт и запись в `TEMPLATES`.

### 3. Расширить `register-request/index.ts`
После отправки письма заявителю — запросить из БД всех пользователей с ролью `admin`, и каждому отправить `new-registration-request` через `send-transactional-email`.

Логика:
```
const { data: admins } = await supabaseAdmin
  .from("user_roles")
  .select("user_id, profiles(email, full_name)")
  .eq("role", "admin");

for (const admin of admins) {
  await fetch(.../send-transactional-email, {
    body: {
      templateName: "new-registration-request",
      recipientEmail: admin.profiles.email,
      idempotencyKey: `new-reg-admin-${userData.user.id}-${admin.user_id}`,
      templateData: { adminName: admin.profiles.full_name, applicantName: full_name, applicantEmail: email },
    }
  });
}
```

### 4. Задеплоить edge functions

**Файлы для изменения:**
- `supabase/functions/_shared/transactional-email-templates/new-registration-request.tsx` — новый
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — регистрация
- `supabase/functions/register-request/index.ts` — отправка админам

