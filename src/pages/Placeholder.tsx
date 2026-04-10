import { useLocation } from "react-router-dom";

const titles: Record<string, string> = {
  "/needs": "Задачи партнеров",
  "/hypotheses": "Гипотезы сотрудничества",
  "/next-steps": "Следующие шаги",
  "/units": "Коллективы МИЭМ",
  "/competencies": "Компетенции",
  "/users": "Пользователи",
};

export default function Placeholder() {
  const { pathname } = useLocation();
  const title = titles[pathname] || pathname;
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="text-muted-foreground">Страница в разработке. Скоро здесь появится функциональность.</p>
    </div>
  );
}
