

# Исправление ошибки check constraint при создании гипотезы

## Проблема

При создании гипотезы без выбора «Уровень уверенности» отправляется пустая строка `""` вместо `null`. БД имеет check constraint `collaboration_hypotheses_confidence_level_check`, который допускает только конкретные значения (`low`, `medium`, `high`) или `null`.

## Решение

В `src/pages/HypothesisDetail.tsx`, строка ~57-62 — при формировании `payload` конвертировать все необязательные строковые поля из `""` в `null`:

```ts
const payload = {
  ...form,
  title: form.title || null,
  partner_id: form.partner_id || null,
  need_id: form.need_id || null,
  unit_id: form.unit_id || null,
  competency_id: form.competency_id || null,
  confidence_level: form.confidence_level || null,
  relevance_score: form.relevance_score ? Number(form.relevance_score) : null,
  recommended_collaboration_format: form.recommended_collaboration_format || null,
  recommended_entry_point: form.recommended_entry_point || null,
  rationale: form.rationale || null,
  notes: form.notes || null,
};
```

Одна правка в одном файле — все пустые строки превращаются в `null` перед отправкой в БД.

