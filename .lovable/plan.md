

# Добавить новый логотип (кольца) в сайдбар и страницу логина

## Что делаем

Копируем загруженное изображение (два переплетённых кольца) в проект и добавляем его как логотип в сайдбар и на страницу авторизации. Также обновляем favicon.

## Изменения

### 1. Скопировать файл
- `lov-copy user-uploads://content.png src/assets/logo.png`
- `lov-copy user-uploads://content.png public/logo.png` (для favicon/meta)

### 2. `src/components/AppSidebar.tsx`
- Импортировать `logo` из `@/assets/logo.png`
- Добавить блок с логотипом перед первой SidebarGroup: изображение по центру, `max-w-[100px]` в развёрнутом виде, `h-8 w-8` в collapsed
- Разделитель `border-b` снизу

### 3. `src/pages/Auth.tsx`
- Импортировать логотип
- Добавить `<img>` перед заголовком формы, `h-16 mx-auto mb-2`

### 4. `index.html`
- Заменить favicon на `/logo.png`

