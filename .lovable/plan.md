

# Настройки AI-генерации в админке

## Что получит пользователь

В админке на вкладке «Настройки» появится секция **«AI-генерация профайлов»** с:
- **Выбор модели** — dropdown с доступными моделями (gemini-3-flash, gemini-2.5-flash, gemini-2.5-pro, gpt-5-mini)
- **Системный промт** — textarea с текущим промтом, редактируемый админом
- **Кнопка «Сохранить»** и **«Сбросить к умолчанию»**

Настройки хранятся в БД и читаются edge function при каждой генерации.

## Что будет сделано

### 1. Таблица `app_settings` (миграция)

```sql
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
-- Чтение для всех аутентифицированных
CREATE POLICY "authenticated read" ON public.app_settings FOR SELECT TO authenticated USING (true);
-- Запись только для админов
CREATE POLICY "admin write" ON public.app_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
```

Две записи с ключами:
- `ai_profile_model` → `{"model": "google/gemini-3-flash-preview"}`
- `ai_profile_prompt` → `{"prompt": "<текущий SYSTEM_PROMPT>"}`

### 2. Компонент `AdminAISettings.tsx`

- Загружает настройки из `app_settings` по ключам `ai_profile_model` и `ai_profile_prompt`
- Dropdown для выбора модели
- Textarea для редактирования промта (с подсветкой количества символов)
- Кнопки «Сохранить» и «Сбросить к умолчанию»
- Upsert в `app_settings` при сохранении

### 3. Новая вкладка в `Admin.tsx`

Добавить вкладку «AI» (иконка Sparkles) между «Письма» и «Настройки».

### 4. Обновление edge function `generate-partner-profile`

Вместо хардкода `SYSTEM_PROMPT` и модели:
- Читать из `app_settings` при каждом вызове
- Если записей нет — использовать дефолтные значения (текущий промт и модель)

## Файлы

| Файл | Действие |
|------|----------|
| миграция SQL | Создать таблицу `app_settings` + seed |
| `src/components/AdminAISettings.tsx` | Новый компонент |
| `src/pages/Admin.tsx` | Добавить вкладку «AI» |
| `supabase/functions/generate-partner-profile/index.ts` | Читать промт и модель из БД |

