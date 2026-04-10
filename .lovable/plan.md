

# Единообразие кнопки «Удалить» на всех карточках

## Текущая ситуация

Три разных варианта оформления и расположения:

1. **5 страниц** (Source, Competency, NextStep, Evidence, Need) — красная кнопка `variant="destructive"` прямо в заголовке
2. **3 страницы** (PartnerContact, UnitContact, Hypothesis) — красная кнопка в заголовке с `ml-auto`
3. **2 страницы** (Partner, Unit) — `variant="outline"` с красным текстом, внизу формы рядом с «Сохранить»

## Решение

Привести все 10 страниц к единому стилю: кнопка в **заголовке**, стиль `variant="destructive"`, размер `size="sm"`, без `ml-auto`. Это исходный паттерн, который уже используется в большинстве страниц (5 из 10).

Формат заголовка на всех страницах:
```text
[← назад]  Название   [Удалить]
```

## Файлы и изменения

| Файл | Что сделать |
|------|-------------|
| `src/pages/PartnerDetail.tsx` | Вернуть кнопку из низа формы в заголовок, `variant="destructive" size="sm"` |
| `src/pages/UnitDetail.tsx` | Аналогично — из низа формы в заголовок |
| `src/pages/PartnerContactDetail.tsx` | Убрать `ml-auto` |
| `src/pages/UnitContactDetail.tsx` | Убрать `ml-auto` |
| `src/pages/HypothesisDetail.tsx` | Убрать лишние переносы строк, оставить в одну строку как у остальных |

Остальные 5 страниц (Source, Competency, NextStep, Evidence, Need) уже в целевом стиле — не трогаем.

