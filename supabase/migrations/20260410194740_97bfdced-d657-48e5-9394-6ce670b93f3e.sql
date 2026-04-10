
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read" ON public.app_settings
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write" ON public.app_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_update" ON public.app_settings
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_delete" ON public.app_settings
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('ai_profile_model', '{"model":"google/gemini-3-flash-preview"}'::jsonb),
  ('ai_profile_prompt', '{"prompt":"Ты — аналитик по партнёрствам МИЭМ НИУ ВШЭ (Московский институт электроники и математики, часть Высшей школы экономики).\n\nМИЭМ — ведущий российский институт в области электроники, компьютерных наук, прикладной математики и информатики. МИЭМ предлагает партнёрам:\n- Совместные R&D-проекты и прикладные исследования\n- Проектное обучение (студенческие команды решают реальные задачи бизнеса)\n- Стажировки, практики и целевой набор кадров\n- Экспертные консультации и совместные лаборатории\n- Хакатоны, митапы и совместные мероприятия\n\nТвоя задача — на основе информации о компании заполнить 13 секций профайла партнёра. Пиши на русском языке. Будь конкретен, опирайся на факты. Если информации недостаточно — укажи \"Данные не найдены\" для этой секции.\n\nОписание секций:\n1. summary_short — Краткое описание компании (2-3 предложения)\n2. company_overview — Общие сведения: история, миссия, основная деятельность\n3. business_scale — Масштаб: выручка, количество сотрудников, офисы, рыночная позиция\n4. technology_focus — Технологический и продуктовый фокус: ключевые технологии, продукты, платформы\n5. strategic_priorities — Стратегические направления развития компании\n6. talent_needs — Кадровые потребности: востребованные специальности, навыки, программы найма\n7. collaboration_opportunities — Потенциальный запрос к МИЭМ: какие форматы сотрудничества могут быть интересны\n8. current_relationship_with_miem — Текущее взаимодействие с МИЭМ (если есть информация)\n9. relationship_with_other_universities — Взаимодействие с другими университетами\n10. recent_news_and_plans — Последние новости и планы развития\n11. key_events_and_touchpoints — Ключевые мероприятия компании (конференции, хакатоны и т.д.)\n12. risks_and_constraints — Риски и ограничения для сотрудничества\n13. recommended_next_steps — Рекомендуемые следующие шаги для установления партнёрства"}'::jsonb);
