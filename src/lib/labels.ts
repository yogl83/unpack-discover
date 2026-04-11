// Centralized label and color dictionaries for all entities

// === Partner status ===
export const partnerStatusLabels: Record<string, string> = {
  new: "Новый", in_review: "На рассмотрении", in_progress: "В работе",
  active: "Активный", on_hold: "На паузе", archived: "Архив",
};
export const partnerStatusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800", in_review: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-indigo-100 text-indigo-800", active: "bg-green-100 text-green-800",
  on_hold: "bg-orange-100 text-orange-800", archived: "bg-gray-100 text-gray-600",
};

// === Priority ===
export const priorityLabels: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический",
};
export const priorityColors: Record<string, string> = {
  low: "bg-green-100 text-green-800", medium: "bg-yellow-100 text-yellow-800",
  high: "bg-orange-100 text-orange-800", critical: "bg-red-100 text-red-800",
};

// === Need status ===
export const needStatusLabels: Record<string, string> = {
  hypothesis: "Гипотеза", confirmed: "Подтверждена", in_progress: "В работе",
  resolved: "Решена", rejected: "Отклонена",
};

// === Hypothesis status ===
export const hypothesisStatusLabels: Record<string, string> = {
  new: "Новая", in_progress: "В работе", confirmed: "Подтверждена", rejected: "Отклонена",
  moved_to_initiative: "В инициативу", moved_to_project: "В проект",
};

// === Confidence level ===
export const confidenceLevelLabels: Record<string, string> = {
  A: "Высокий", B: "Средний", C: "Низкий",
};

// === Next step status ===
export const nextStepStatusLabels: Record<string, string> = {
  new: "Новый", in_progress: "В работе", done: "Выполнен", cancelled: "Отменён",
};

// === Contact kind ===
export const contactKindLabels: Record<string, string> = {
  official: "Официальный", warm: "Тёплый", operational: "Оперативный",
  decision_maker: "ЛПР", technical: "Технический", other: "Другой",
};

// === Unit member roles ===
export const memberRoleLabels: Record<string, string> = {
  lead: "Руководитель", deputy: "Заместитель", researcher: "Исследователь",
  engineer: "Инженер", pm: "PM", expert: "Эксперт", other: "Другой",
};

// === Unit type ===
export const unitTypeLabels: Record<string, string> = {
  lab: "Лаборатория", project_group: "Проектная группа",
  center: "Центр", department: "Департамент",
};

// Combined status labels (used in PartnerDetail where multiple entity statuses appear)
export const allStatusLabels: Record<string, string> = {
  ...partnerStatusLabels,
  ...needStatusLabels,
  ...hypothesisStatusLabels,
  ...nextStepStatusLabels,
};
