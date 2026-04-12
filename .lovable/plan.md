

# Исправить обрезку логотипа: симметрично + прозрачный фон

## Проблема
1. Обрезка была только снизу — сверху осталось лишнее пустое пространство. Нужна симметричная обрезка.
2. Прозрачный фон заменён на белый — на тёмном сайдбаре логотип выглядит как белый квадрат.

## Решение

1. **Скопировать оригинал** из `user-uploads://content-2.png`
2. **Обрезать с `-trim` и сохранить прозрачность**: использовать `-fuzz 5% -trim +repage` без `-bordercolor white` — вместо этого `-bordercolor none -border 10` для прозрачного padding
3. **Убедиться что формат PNG** с альфа-каналом сохранён (никаких `-flatten` или white background)
4. **Заменить** `src/assets/logo.png` и `public/logo.png`

### Команда
```bash
nix run nixpkgs#imagemagick -- convert /tmp/logo-original.png \
  -fuzz 5% -trim +repage \
  -bordercolor none -border 10 \
  /tmp/logo-trimmed.png
```

Ключевое отличие: `-bordercolor none` вместо `-bordercolor white` сохраняет прозрачность.

