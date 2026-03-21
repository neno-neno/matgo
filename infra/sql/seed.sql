INSERT INTO achievements (id, code, name, description, icon)
VALUES
  ('f2e5fb31-85df-4e2b-9bea-000000000001', 'streak_7', 'Fogo Constante', 'Estude por 7 dias seguidos', 'flame'),
  ('f2e5fb31-85df-4e2b-9bea-000000000002', 'accuracy_master', 'Mira Perfeita', 'Acerte 20 questoes seguidas', 'target'),
  ('f2e5fb31-85df-4e2b-9bea-000000000003', 'geometry_hero', 'Heroi da Geometria', 'Complete um mundo inteiro de geometria', 'triangle')
ON CONFLICT (code) DO NOTHING;
