

# Обрезать логотип — убрать вертикальные поля до 0

## Проблема
Сверху и снизу логотипа остаётся белое/прозрачное пространство. Нужно убрать его полностью.

## Решение
Использовать `-fuzz 5% -trim +repage` для автоматического удаления прозрачных полей, затем НЕ добавлять вертикальный padding. Горизонтальный padding тоже убираем, раз просьба — до 0.

### Команда
```bash
nix run nixpkgs#imagemagick -- convert src/assets/logo.png \
  -fuzz 5% -trim +repage \
  src/assets/logo.png
cp src/assets/logo.png public/logo.png
```

