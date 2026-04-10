

# Исправление ошибки загрузки «Внутренние контакты»

## Проблема
Запрос `unit_contacts.select("*, miem_units(unit_name)")` возвращает HTTP 300 — PostgREST не может выбрать между двумя FK:
- `unit_contacts.unit_id → miem_units.unit_id`
- `miem_units.lead_contact_id → unit_contacts.unit_contact_id`

## Решение
В `InternalContacts.tsx` заменить `miem_units(unit_name)` на `miem_units!unit_contacts_unit_id_fkey(unit_name)` — явно указать FK.

Аналогично проверить и исправить все другие места, где `unit_contacts` join'ится с `miem_units` без disambiguator (например, `UnitDetail.tsx`, `UnitContactDetail.tsx`).

### Файлы
- `src/pages/InternalContacts.tsx` — строка запроса
- Проверить: `src/pages/UnitDetail.tsx`, `src/pages/UnitContactDetail.tsx` на аналогичные запросы

