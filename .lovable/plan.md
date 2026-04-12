

# Исправить счётчик на вкладке «Коллектив»

## Проблема
Строка 302 в `src/pages/UnitDetail.tsx` использует `unitContacts?.length` для бейджа на вкладке. Но коллектив теперь формируется из `memberships`, а не из `unitContacts`. Полесский привязан к другому подразделению, поэтому `unitContacts` для текущего подразделения содержит только 1 запись.

## Решение

В `src/pages/UnitDetail.tsx`, строка 302: заменить `unitContacts?.length` на `memberships?.length` (в двух местах — значение для условия и отображаемое число).

```tsx
// Было:
{unitContacts?.length ? <Badge ...>{unitContacts.length}</Badge> : null}

// Станет:
{memberships?.length ? <Badge ...>{memberships.length}</Badge> : null}
```

## Объём
1 строка в 1 файле.

