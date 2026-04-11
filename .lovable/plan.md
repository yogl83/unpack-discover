

# Исправление ошибки регистрации

## Проблема

При отправке заявки на регистрацию edge function `register-request` возвращает 400 с сообщением «Пароль должен быть не менее 6 символов». Пароль на скриншоте — 5 символов.

Две связанных проблемы:

1. **Ошибка не показывается пользователю** — при статусе 400 `supabase.functions.invoke` кладёт результат в `res.error` (тип `FunctionsHttpError`), но `res.error.message` содержит общее «Edge Function returned a non-2xx status code», а не текст из тела ответа. Нужно парсить тело: `JSON.parse(await res.error.context.json())`.

2. **Валидация на клиенте недостаточна** — HTML-атрибут `minLength={6}` не всегда срабатывает (зависит от браузера). Нужна явная проверка перед отправкой.

## Решение

Одна правка в `src/pages/Auth.tsx`:

1. Добавить клиентскую проверку длины пароля перед вызовом edge function
2. Корректно извлекать сообщение об ошибке из ответа edge function

```ts
} else if (mode === "register") {
  if (password.length < 6) {
    toast.error("Пароль должен быть не менее 6 символов");
    return;
  }
  const res = await supabase.functions.invoke("register-request", {
    body: { email, password, full_name: fullName },
  });
  if (res.error) {
    // Extract message from edge function response body
    let msg = "Ошибка при отправке заявки";
    try {
      const body = await res.error.context.json();
      if (body?.error) msg = body.error;
    } catch {}
    toast.error(msg);
  } else if (res.data?.error) {
    toast.error(res.data.error);
  } else {
    ...
  }
}
```

Одна правка, один файл.

