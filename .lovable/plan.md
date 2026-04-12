

# Исправить мобильную форму РИД — добавить скролл и адаптивность

## Проблема
На мобильных устройствах (390px) диалог портфолио с полями РИД переполняет экран. Нет скролла, невозможно добраться до нижних полей и кнопок.

## Решение
Обернуть содержимое диалога в `ScrollArea` с ограничением по высоте, чтобы форма прокручивалась на маленьких экранах.

## Изменения

### `src/pages/UnitContactDetail.tsx` и `src/pages/UnitDetail.tsx`
- Добавить `import { ScrollArea } from "@/components/ui/scroll-area"`
- На `DialogContent` добавить класс `max-h-[90vh] overflow-hidden flex flex-col`
- Обернуть `div.grid.gap-4.py-2` (тело формы) в `<ScrollArea className="max-h-[60vh] pr-4">`
- Изменить `grid-cols-2` на `grid-cols-1 sm:grid-cols-2` для полей «Номер регистрации / Страна» и «Год от / Год до» на мобильных

### Затронутые файлы
- `src/pages/UnitContactDetail.tsx`
- `src/pages/UnitDetail.tsx`

Без изменений БД.

