

# Переименование в сайдбаре: «Контакты» → «Сотрудники» (секция МИЭМ)

В `src/components/AppSidebar.tsx` изменить title у элемента контактов в массиве `miemItems`:

```ts
// Было:
{ title: "Контакты", url: "/contacts/internal", icon: Contact }
// Стало:
{ title: "Сотрудники", url: "/contacts/internal", icon: Contact }
```

Один файл, одна строка.

