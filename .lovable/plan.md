

# Исправления профайла: 5 пунктов

## Проблемы

1. **Имя файла**: `_profail.pdf` → должно быть `_profile.pdf`
2. **Гипотезы в содержании**: системный промт всё ещё упоминает `collaboration_opportunities` (строка 39 edge function) — LLM может генерировать контент про возможности сотрудничества. Нужно убрать
3. **Ссылки в PDF не кликабельны**: `jsPDF` рендерит URL как текст, нужно добавить `doc.textWithLink()` или `doc.link()` для URL в источниках
4. **Синий цвет при генерации профайла AI**: сейчас `aiFilledFields` подсветка есть только на странице основной информации партнёра (`PartnerDetail.tsx`). При AI-генерации профайла в `PartnerProfileTab.tsx` нет синей подсветки textarea-полей — нужно добавить
5. **Ссылки на предпросмотре (в UI)**: ссылки `[1]`, `[2]` в тексте секций не ведут к блоку «Источники» — нужно добавить scroll-to-anchor

## Что будет сделано

### 1. Имя файла PDF
**`src/components/partner/ProfilePdfExport.tsx`** строка 215:
- `_profail.pdf` → `_profile.pdf`

### 2. Убрать упоминание collaboration_opportunities из промта
**`supabase/functions/generate-partner-profile/index.ts`** строка 39:
- Удалить строку `- Для collaboration_opportunities — обосновывай каждый формат конкретными фактами о компании`

### 3. Кликабельные ссылки в PDF
**`src/components/partner/ProfilePdfExport.tsx`**:
- В блоке «Источники» использовать `doc.textWithLink()` для URL — ссылки станут кликабельными в PDF-файле

### 4. Синий цвет при AI-генерации профайла
**`src/components/partner/PartnerProfileTab.tsx`**:
- Добавить `aiGeneratedSections` state (`Set<string>`)
- В `generateProfile.onSuccess`: заполнить set ключами секций, которые AI заполнил
- В режиме редактирования: textarea с ключом из set получает `text-blue-600`
- При `saveDraft.onSuccess`: сбросить set

### 5. Ссылки [N] в предпросмотре ведут к блоку источников
**`src/components/partner/PartnerProfileTab.tsx`**:
- Добавить кастомный рендерер для `ReactMarkdown` — ссылки вида `[N]` становятся якорями, кликающими к `#references`

## Файлы

| Файл | Действие |
|------|----------|
| `src/components/partner/ProfilePdfExport.tsx` | Имя файла, кликабельные ссылки |
| `src/components/partner/PartnerProfileTab.tsx` | Синий цвет AI-полей, якоря [N] |
| `supabase/functions/generate-partner-profile/index.ts` | Убрать collaboration_opportunities из промта |

