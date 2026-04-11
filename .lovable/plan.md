

# Сквозная унификация терминологии

## Эталон (из меню)

| Сущность | Термин |
|----------|--------|
| partners | **Организации** |
| partner_needs | **Потребности** |
| collaboration_hypotheses | **Гипотезы** |
| next_steps | **Следующие шаги** |
| miem_units | **Коллективы** |
| competencies | **Компетенции** |
| contacts (внешние) | **Контакты** (секция ПАРТНЕРЫ) |
| unit_contacts (внутренние) | **Контакты** (секция МИЭМ) |

## Найденные несоответствия

| Файл | Строка | Сейчас | Должно быть |
|------|--------|--------|-------------|
| `AdminSettings.tsx` | 11 | `Партнёры` | `Организации` |
| `AdminSettings.tsx` | 13 | `Задачи партнёров` | `Потребности` |
| `AdminSettings.tsx` | 15 | `Коллективы МИЭМ` | `Коллективы` |
| `AdminSync.tsx` | 20 | `Партнёры` | `Организации` |
| `AdminSync.tsx` | 22 | `Задачи партнёров` | `Потребности` |
| `AdminSync.tsx` | 24 | `Подразделения МИЭМ` | `Коллективы` |
| `AdminSync.tsx` | 27 | `Внутренние контакты` | `Контакты МИЭМ` |
| `Partners.tsx` | 116 | `Задачи` (заголовок столбца) | `Потребности` |
| `Index.tsx` | 35 | `Партнёры` (карточка дашборда) | `Организации` |
| `DashboardSankey.tsx` | 100, 114 | `Партнёры → Потребности → Подразделения` | `Организации → Потребности → Коллективы` |
| `DashboardSankey.tsx` | 74 | `Без подразделения` | `Без коллектива` |
| `UnitSankey.tsx` | 74 | `Подразделение` (fallback) | `Коллектив` |
| `UnitSankey.tsx` | 106, 120 | `Подразделения → Компетенции → Гипотезы` | `Коллективы → Компетенции → Гипотезы` |
| `DashboardMatrix.tsx` | 57, 79 | `Партнёр × Подразделение МИЭМ` | `Организация × Коллектив` |
| `DashboardMatrix.tsx` | 61 | `партнёрам и подразделениям` | `организациям и коллективам` |
| `DashboardMatrix.tsx` | 85 | `Партнёр / Подразделение` | `Организация / Коллектив` |
| `HypothesisDetail.tsx` | 121 | `Подразделение МИЭМ` (label) | `Коллектив` |
| `HypothesisDetail.tsx` | 130 | `Сначала выберите подразделение` | `Сначала выберите коллектив` |
| `ExternalContacts.tsx` | 74 | `Все партнёры` | `Все организации` |
| `PartnerContactDetail.tsx` | 169 | `Внешние контакты` (breadcrumb) | `Контакты` |
| `UnitContactDetail.tsx` | 154 | `Внутренние контакты` (breadcrumb) | `Контакты МИЭМ` |

## План

Замена строк в 12 файлах. Только текстовые лейблы, без изменения логики.

| Файл | Кол-во правок |
|------|---------------|
| `src/components/AdminSettings.tsx` | 3 |
| `src/components/AdminSync.tsx` | 4 |
| `src/pages/Partners.tsx` | 1 |
| `src/pages/Index.tsx` | 1 |
| `src/components/dashboard/DashboardSankey.tsx` | 3 |
| `src/components/dashboard/UnitSankey.tsx` | 3 |
| `src/components/dashboard/DashboardMatrix.tsx` | 4 |
| `src/pages/HypothesisDetail.tsx` | 2 |
| `src/pages/ExternalContacts.tsx` | 1 |
| `src/pages/PartnerContactDetail.tsx` | 1 |
| `src/pages/UnitContactDetail.tsx` | 1 |

Не трогаю: системные промпты AI (generate-partner-profile) — там «партнёр» используется в контексте анализа, это корректно.

