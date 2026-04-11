

# Обновление логотипа и мета-данных сайта

## Что нужно сделать

Загруженное изображение (качели) — логотип. Нужно поставить его как favicon, добавить на страницу логина, в сайдбар, и обновить заголовки.

## Изменения

### 1. Скопировать логотип в проект
- `lov-copy user-uploads://image-19.png public/logo.png`
- `lov-copy user-uploads://image-19.png src/assets/logo.png` (для импорта в React)
- Удалить `public/favicon.ico`

### 2. `index.html` — заголовок и favicon
- Заменить `<title>Lovable App</title>` на `<title>МИЭМ — Партнёрства</title>`
- Заменить все `og:title`, `twitter:title` на «МИЭМ — Партнёрства»
- Заменить `og:description`, `twitter:description` на «Система управления партнёрствами МИЭМ НИУ ВШЭ»
- Добавить `<link rel="icon" href="/logo.png" type="image/png">`

### 3. `src/pages/Auth.tsx` — логотип на странице входа
- Импортировать `logo from "@/assets/logo.png"`
- Добавить `<img src={logo} alt="МИЭМ" className="h-16 mx-auto mb-2" />` перед заголовком в CardHeader

### 4. `src/components/AppSidebar.tsx` — логотип в сайдбаре
- Импортировать логотип
- Добавить в верхнюю часть Sidebar (перед первой SidebarGroup) изображение + название «Партнёрства» (скрывается при collapsed)

### 5. `src/components/AppLayout.tsx` — без изменений
Хедер остаётся как есть (пользователь + роль + выход).

**Файлы для изменения:** `index.html`, `Auth.tsx`, `AppSidebar.tsx`; копирование файла логотипа.

