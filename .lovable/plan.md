

# Создать favicon и показать превью

## План

1. **Сгенерировать favicon-версии** из текущего логотипа:
   - 32×32 — стандартный favicon для вкладок браузера
   - 180×180 — для Apple touch icon и других высоких разрешений
   
2. **Показать превью** обеих версий пользователю для согласования

3. **После подтверждения** — обновить `public/favicon.ico` (или `.png`) и `index.html`

## Технические детали

ImageMagick команды для генерации:
```bash
# 32x32 favicon
nix run nixpkgs#imagemagick -- convert src/assets/logo.png \
  -resize 32x32 -background transparent \
  /tmp/favicon-32.png

# 180x180 Apple touch icon  
nix run nixpkgs#imagemagick -- convert src/assets/logo.png \
  -resize 180x180 -background transparent \
  /tmp/favicon-180.png
```

Затем покажу изображения пользователю перед применением к проекту.

