

# Улучшение AI-заполнения: убрать ИНН/ОГРН + подсветка AI-полей

## Что получит пользователь

1. AI больше не пытается угадывать ИНН и ОГРН — эти поля заполняются только вручную
2. После нажатия «Заполнить с AI» все заполненные AI-ом поля отображаются **синим шрифтом**
3. При сохранении формы синий цвет сбрасывается на обычный чёрный

## Что будет сделано

### 1. Edge function: убрать `inn` и `ogrn`

**`supabase/functions/autofill-partner-info/index.ts`**:
- Удалить `inn` и `ogrn` из `properties` в tool calling schema
- Добавить в системный промт: «НЕ выдумывай ИНН, ОГРН и регистрационные номера»

### 2. Frontend: подсветка AI-полей синим

**`src/pages/PartnerDetail.tsx`**:
- Добавить state: `const [aiFilledFields, setAiFilledFields] = useState<Set<string>>(new Set())`
- В `handleAutofill`: при заполнении пустого поля — добавлять ключ в `aiFilledFields`
- Убрать `inn`, `ogrn` из `fillableKeys`
- На каждом Input/Select/Textarea: если поле в `aiFilledFields` — добавлять `className="text-blue-600"`
- В `save.mutate` (onSuccess): сбрасывать `setAiFilledFields(new Set())`

### Техническая деталь

Подсветка работает через условный класс:
```tsx
<Input className={aiFilledFields.has("website_url") ? "text-blue-600" : ""} ... />
```

## Файлы

| Файл | Действие |
|------|----------|
| `supabase/functions/autofill-partner-info/index.ts` | Убрать inn/ogrn из schema и промта |
| `src/pages/PartnerDetail.tsx` | State aiFilledFields, синий шрифт, сброс при сохранении |

