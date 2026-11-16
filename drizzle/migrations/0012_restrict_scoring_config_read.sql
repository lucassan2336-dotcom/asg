DROP POLICY IF EXISTS "Publico le configuracao de pontuacao" ON public.ranking_scoring_config;
CREATE POLICY "Publico le configuracao de pontuacao ativa" ON public.ranking_scoring_config
  FOR SELECT TO anon, authenticated USING (id = 1);
REVOKE SELECT ON public.ranking_scoring_config FROM anon;
GRANT SELECT (id, first_place_points, second_place_points, third_place_points, tiebreaker_rule, updated_at) ON public.ranking_scoring_config TO anon;