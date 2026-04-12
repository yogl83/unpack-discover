

# Дополнительная обрезка логотипа

Обрезать текущий логотип, убрав 20px сверху и снизу, 22px слева и справа, сохранив прозрачность.

## Шаги

1. Определить текущий размер `src/assets/logo.png` через `identify`
2. Обрезать с `-shave 22x20` (убирает указанное количество пикселей с каждой стороны)
3. Заменить `src/assets/logo.png` и `public/logo.png`

### Команда
```bash
nix run nixpkgs#imagemagick -- convert src/assets/logo.png \
  -shave 22x20 +repage \
  src/assets/logo.png
cp src/assets/logo.png public/logo.png
```

