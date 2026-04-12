
# Изменить порядок типов портфолио

Нужно поменять порядок ключей в `portfolioTypeLabels` в `src/lib/labels.ts`:

**Было:** project → publication → rid → product → other  
**Стало:** product → project → rid → publication → other

### Изменение
В `src/lib/labels.ts` строка 71–74 — переставить ключи:
```ts
export const portfolioTypeLabels: Record<string, string> = {
  product: "Продукт", project: "Проект", rid: "РИД",
  publication: "Публикация", other: "Другое",
};
```

Также переставить ключи в `portfolioFieldConfig` в том же файле для консистентности.

### Затронутые файлы
- `src/lib/labels.ts`
