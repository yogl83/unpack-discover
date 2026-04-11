

# Замена `confirm()` на красивый диалог

## Проблема

Браузерный `confirm()` показывает уродливый URL preview-сервера в заголовке. В проекте уже есть компонент `ConfirmDialog` на базе `AlertDialog`.

## Решение

Заменить все вызовы `confirm()` на `ConfirmDialog` в трёх местах:

1. **`src/components/AdminUsers.tsx`** — строка 184: кнопка удаления пользователя (`confirm("Удалить пользователя?")`) → `ConfirmDialog` с `variant="destructive"`, `triggerSize="icon"`, иконка `Trash2`

2. **`src/components/AdminUsers.tsx`** — строка 215: кнопка «Отклонить» в `PendingRow` (`confirm("Отклонить заявку...")`) → `ConfirmDialog` с кастомным trigger (кнопка «Отклонить» с иконкой `XCircle`), `description="Отклонить заявку и удалить пользователя?"`

3. **`src/components/partner/ProfileFileUpload.tsx`** — строка 89: удаление файла (`confirm(Удалить файл...)`) → `ConfirmDialog` с описанием, включающим имя файла

Все три замены используют уже существующий `ConfirmDialog` — новых компонентов не нужно. Для «Отклонить» немного расширим пропсы `ConfirmDialog`: добавим `actionLabel` для текста кнопки подтверждения (вместо захардкоженного «Удалить»).

