

# Исправление отображения коллектива

## Проблема
1. Таблица коллектива рендерит `unitContacts` (контакты с `unit_id` текущего подразделения), а не `memberships`. Полесский привязан к другому подразделению, поэтому его membership создаётся, но он не виден.
2. Кнопка удаления удаляет запись `unit_contacts` (контакт целиком), а должна удалять `unit_contact_memberships` (членство в коллективе).

## Решение

В `src/pages/UnitDetail.tsx` (строки 639–740):

1. **Переключить источник данных**: вместо итерации по `unitContacts` — итерировать по `memberships`, используя join-данные `unit_contacts(full_name, job_title, email)` которые уже подгружаются в запросе memberships.

2. **Обновить рендер таблицы и карточек**:
   - Каждый элемент — это `membership`, из него берём `unit_contacts.full_name`, `unit_contacts.job_title`, `member_role`
   - `isLead` определять по `membership.is_lead` или `membership.unit_contact_id === leadContactId`
   - Навигация при клике: `/units/${id}/contacts/${m.unit_contact_id}`

3. **Исправить удаление**: удалять из `unit_contact_memberships` по `membership_id`, а не из `unit_contacts`

4. **Условие «нет данных»**: проверять `!memberships?.length` вместо `!unitContacts?.length`

## Затронутый файл
- `src/pages/UnitDetail.tsx` — строки 639–740 (рендер таблицы и карточек коллектива)

## Объём
~50 строк изменений в одном файле. Без миграций.

