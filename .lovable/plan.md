

# Исправить редирект после сохранения карточки сотрудника

## Проблема
Сейчас при открытии карточки через маршрут `/units/:unitId/contacts/:contactId` после сохранения происходит `navigate(/units/${unitId})` — возврат на страницу коллектива, а не на список сотрудников.

## Решение
Добавить навигацию «назад» с учётом того, откуда пришёл пользователь. Самый простой вариант — всегда возвращать на `/contacts/internal` при `standalone`, а при наличии `unitId` — на `/units/${unitId}`.

Но если пользователь хочет **всегда** возвращаться на `/contacts/internal`, нужно изменить обе ветки в `onSuccess` у `save` и `del`.

## Предлагаемый вариант
Использовать `navigate(-1)` (браузерная история назад) — так пользователь вернётся туда, откуда пришёл, будь то список сотрудников или страница коллектива.

### Изменения в `src/pages/UnitContactDetail.tsx`
В `onSuccess` мутаций `save` и `del` заменить:
```ts
// Было:
if (standalone) {
  navigate("/contacts/internal");
} else {
  navigate(`/units/${unitId}`);
}

// Станет:
qc.invalidateQueries({ queryKey: ["all-internal-contacts"] });
qc.invalidateQueries({ queryKey: ["unit-contacts", unitId] });
navigate(-1);
```

Один файл, две правки (save + del).

