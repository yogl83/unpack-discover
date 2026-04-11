

# Улучшение интерфейса редактирования профайла

## Приоритетные улучшения (по влиянию на верификацию)

### 1. Split-view: textarea слева, preview справа
Каждая секция при редактировании показывает два столбца:
- Слева: textarea с markdown
- Справа: отрендеренный ReactMarkdown с таблицами, ссылками, списками

Реализация: `grid grid-cols-2 gap-4` внутри каждой секции в edit mode. Preview обновляется в реальном времени при наборе текста.

### 2. Accordion в режиме редактирования
Вместо плоского списка textarea — использовать Accordion (как в view mode). Каждую секцию можно свернуть/развернуть. По умолчанию открыта первая.

### 3. Плавающий блок источников
Источники показывать в фиксированной панели справа (или в sticky-блоке внизу экрана), чтобы при редактировании любой секции пользователь видел список ссылок. При hover на `[N]` в textarea — подсветка соответствующего источника.

### 4. Индикатор заполненности секций
В заголовке каждой секции — иконка: ✓ (заполнена), ○ (пустая). В шапке — прогресс-бар: «6/8 секций заполнено».

### 5. Кнопка «Перегенерировать секцию»
Рядом с каждой секцией в edit mode — кнопка с иконкой Sparkles. Вызывает edge function с параметром `section_key`, перегенерирует только одну секцию.

## Что НЕ делаем сейчас (можно позже)
- Diff между версиями — сложная фича, отдельный запрос
- Inline-подсветка номера источника при hover в textarea — технически сложно в textarea

## Порядок реализации

### Шаг 1: Accordion + split-view в edit mode
**`src/components/partner/PartnerProfileTab.tsx`**:
- Обернуть секции в `Accordion` в edit mode
- Внутри каждой секции: `grid grid-cols-1 lg:grid-cols-2 gap-3`
- Слева textarea, справа ReactMarkdown preview (те же components что в view mode)

### Шаг 2: Индикатор заполненности
**`src/components/partner/PartnerProfileTab.tsx`**:
- Добавить прогресс `{filledCount}/{total}` рядом с заголовком «Редактирование»
- В AccordionTrigger: иконка Check/Circle рядом с названием секции

### Шаг 3: Sticky-блок источников
**`src/components/partner/PartnerProfileTab.tsx`**:
- Источники в `sticky bottom-0` или в `aside` при lg-экранах
- Всегда видны при скролле секций

### Шаг 4: Перегенерация отдельной секции
**`supabase/functions/generate-partner-profile/index.ts`**:
- Добавить опциональный параметр `section_key`
- Если указан — генерировать только одну секцию, обновить только её в записи

**`src/components/partner/PartnerProfileTab.tsx`**:
- Кнопка Sparkles у каждой секции, вызывает mutation с `section_key`

## Файлы

| Файл | Действие |
|------|----------|
| `src/components/partner/PartnerProfileTab.tsx` | Accordion + split-view, индикаторы, sticky источники, кнопка перегенерации |
| `supabase/functions/generate-partner-profile/index.ts` | Поддержка `section_key` для перегенерации одной секции |

