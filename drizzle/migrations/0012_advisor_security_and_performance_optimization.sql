-- ============================================================================
-- MIGRATION 0012: Otimização de Segurança e Performance (Supabase Advisors)
-- 1. Revoga EXECUTE de todas as funções internas/triggers para PUBLIC, anon e authenticated
-- 2. Converte funções públicas de leitura (ranking e histórico) para SECURITY INVOKER
-- 3. Remove permissão de execução de has_role para anon (isolando políticas públicas)
-- 4. Adiciona índices em todas as chaves estrangeiras (unindexed_foreign_keys)
-- 5. Otimiza políticas RLS com InitPlan ((select auth.uid())) e elimina políticas permissivas duplicadas
-- ============================================================================

-- 1. Revogar execução pública de funções de trigger e rotinas internas
REVOKE ALL ON FUNCTION public.prevent_self_diretoria_revocation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_account_type() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_skater_competitive_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_after_championship_podium_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_after_skater_modality_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_championship_podium() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalculate_all_skater_rankings() FROM PUBLIC, anon, authenticated;

-- Revogar has_role de PUBLIC e anon (somente authenticated precisa consultar papéis)
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Converter funções públicas de consulta de ranking para SECURITY INVOKER
CREATE OR REPLACE FUNCTION public.get_modality_ranking(_modality public.skate_modality)
RETURNS TABLE (
  skater_id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  age int,
  years_practicing text,
  favorite_trick text,
  stance text,
  modality public.skate_modality,
  total_points int,
  first_places int,
  second_places int,
  third_places int,
  rank_position int,
  trophy_tier text
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_tiebreaker text := 'podium_counts';
BEGIN
  IF _modality NOT IN ('street', 'vert') THEN
    RETURN;
  END IF;

  SELECT c.tiebreaker_rule INTO v_tiebreaker
  FROM public.ranking_scoring_config c
  WHERE c.id = 1;

  RETURN QUERY
  WITH skater_calc AS (
    SELECT
      sp.id AS s_id,
      sp.user_id AS u_id,
      sp.full_name AS f_name,
      sp.avatar_url AS av_url,
      CASE WHEN sp.show_age_publicly THEN sp.age ELSE NULL END AS public_age,
      sp.years_practicing AS y_prac,
      sp.favorite_trick AS fav_trick,
      sp.stance AS st,
      sp.modality AS mod,
      coalesce(sum(
        CASE
          WHEN cp.first_place_skater_id = sp.id THEN cp.first_points
          WHEN cp.second_place_skater_id = sp.id THEN cp.second_points
          WHEN cp.third_place_skater_id = sp.id THEN cp.third_points
          ELSE 0
        END
      ), 0)::int AS pts,
      count(*) FILTER (WHERE cp.first_place_skater_id = sp.id)::int AS p1,
      count(*) FILTER (WHERE cp.second_place_skater_id = sp.id)::int AS p2,
      count(*) FILTER (WHERE cp.third_place_skater_id = sp.id)::int AS p3
    FROM public.skater_profiles sp
    LEFT JOIN public.championship_podiums cp
      ON cp.status = 'publicado'
      AND cp.modality = _modality
      AND (
        cp.first_place_skater_id = sp.id
        OR cp.second_place_skater_id = sp.id
        OR cp.third_place_skater_id = sp.id
      )
    WHERE sp.is_active = true
      AND (sp.modality = _modality OR sp.modality = 'versatil')
    GROUP BY sp.id, sp.user_id, sp.full_name, sp.avatar_url, sp.show_age_publicly, sp.age, sp.years_practicing, sp.favorite_trick, sp.stance, sp.modality
  ),
  ranked AS (
    SELECT
      sc.*,
      CASE
        WHEN coalesce(v_tiebreaker, 'podium_counts') = 'podium_counts' THEN
          RANK() OVER (
            ORDER BY
              sc.pts DESC,
              sc.p1 DESC,
              sc.p2 DESC,
              sc.p3 DESC
          )::int
        ELSE
          RANK() OVER (
            ORDER BY sc.pts DESC
          )::int
      END AS pos
    FROM skater_calc sc
  )
  SELECT
    r.s_id,
    r.u_id,
    r.f_name,
    r.av_url,
    r.public_age,
    r.y_prac,
    r.fav_trick,
    r.st,
    r.mod,
    r.pts,
    r.p1,
    r.p2,
    r.p3,
    r.pos,
    CASE
      WHEN r.pos = 1 AND r.pts > 0 THEN 'ouro'
      WHEN r.pos = 2 AND r.pts > 0 THEN 'prata'
      WHEN r.pos = 3 AND r.pts > 0 THEN 'bronze'
      ELSE NULL
    END AS trophy_tier
  FROM ranked r
  ORDER BY r.pos ASC, lower(r.f_name) ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_modality_ranking(public.skate_modality) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_modality_ranking(public.skate_modality) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_skater_championship_history(_skater_id uuid)
RETURNS TABLE (
  championship_id uuid,
  championship_name text,
  event_date date,
  modality public.skate_modality,
  placement int,
  points_awarded int,
  notes text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    cp.id AS championship_id,
    cp.championship_name,
    cp.event_date,
    cp.modality,
    CASE
      WHEN cp.first_place_skater_id = _skater_id THEN 1
      WHEN cp.second_place_skater_id = _skater_id THEN 2
      WHEN cp.third_place_skater_id = _skater_id THEN 3
    END AS placement,
    CASE
      WHEN cp.first_place_skater_id = _skater_id THEN cp.first_points
      WHEN cp.second_place_skater_id = _skater_id THEN cp.second_points
      WHEN cp.third_place_skater_id = _skater_id THEN cp.third_points
    END AS points_awarded,
    cp.notes
  FROM public.championship_podiums cp
  JOIN public.skater_profiles sp ON sp.id = _skater_id
  WHERE cp.status = 'publicado'
    AND (sp.modality = 'versatil' OR cp.modality = sp.modality)
    AND (
      cp.first_place_skater_id = _skater_id
      OR cp.second_place_skater_id = _skater_id
      OR cp.third_place_skater_id = _skater_id
    )
  ORDER BY cp.event_date DESC, cp.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.get_skater_championship_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_skater_championship_history(uuid) TO anon, authenticated, service_role;

-- 3. Criar índices de cobertura para todas as Foreign Keys
CREATE INDEX IF NOT EXISTS idx_assoc_memberships_application_id ON public.association_memberships(application_id);
CREATE INDEX IF NOT EXISTS idx_champ_podiums_first_skater ON public.championship_podiums(first_place_skater_id);
CREATE INDEX IF NOT EXISTS idx_champ_podiums_second_skater ON public.championship_podiums(second_place_skater_id);
CREATE INDEX IF NOT EXISTS idx_champ_podiums_third_skater ON public.championship_podiums(third_place_skater_id);
CREATE INDEX IF NOT EXISTS idx_champ_podiums_created_by ON public.championship_podiums(created_by);
CREATE INDEX IF NOT EXISTS idx_champ_podiums_updated_by ON public.championship_podiums(updated_by);
CREATE INDEX IF NOT EXISTS idx_comp_results_created_by ON public.competition_results(created_by);
CREATE INDEX IF NOT EXISTS idx_fin_attachments_tx_id ON public.financial_attachments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_category_id ON public.financial_transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_original_tx_id ON public.financial_transactions(original_transaction_id);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_created_by ON public.gallery_photos(created_by);
CREATE INDEX IF NOT EXISTS idx_mem_review_notes_app_id ON public.membership_review_notes(application_id);
CREATE INDEX IF NOT EXISTS idx_ranking_config_updated_by ON public.ranking_scoring_config(updated_by);
CREATE INDEX IF NOT EXISTS idx_site_content_updated_by ON public.site_content(updated_by);
CREATE INDEX IF NOT EXISTS idx_site_projects_created_by ON public.site_projects(created_by);

-- 4. Otimizar Políticas RLS (InitPlan + consolidação de políticas permissivas)

-- profiles
DROP POLICY IF EXISTS "Ver o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Criar o próprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Editar o próprio perfil" ON public.profiles;

CREATE POLICY "Ver o próprio perfil" ON public.profiles
  FOR SELECT TO authenticated
  USING (id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Criar o próprio perfil" ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Editar o próprio perfil" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

-- user_roles
DROP POLICY IF EXISTS "Ver os próprios papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Diretoria gerencia papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Diretoria insere papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Diretoria atualiza papéis" ON public.user_roles;
DROP POLICY IF EXISTS "Diretoria remove papéis" ON public.user_roles;

CREATE POLICY "Ver os próprios papéis" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere papéis" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza papéis" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove papéis" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- audit_logs
DROP POLICY IF EXISTS "Diretoria lê auditoria" ON public.audit_logs;
CREATE POLICY "Diretoria lê auditoria" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- membership_applications
DROP POLICY IF EXISTS "Ver a própria solicitação" ON public.membership_applications;
DROP POLICY IF EXISTS "Enviar solicitação pendente" ON public.membership_applications;

CREATE POLICY "Ver a própria solicitação" ON public.membership_applications
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Enviar solicitação pendente" ON public.membership_applications
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND status = 'pendente'
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND review_notes IS NULL
  );

-- association_memberships
DROP POLICY IF EXISTS "Ver a própria associação" ON public.association_memberships;
DROP POLICY IF EXISTS "Diretoria gerencia associações" ON public.association_memberships;
DROP POLICY IF EXISTS "Diretoria insere associações" ON public.association_memberships;
DROP POLICY IF EXISTS "Diretoria atualiza associações" ON public.association_memberships;
DROP POLICY IF EXISTS "Diretoria remove associações" ON public.association_memberships;

CREATE POLICY "Ver a própria associação" ON public.association_memberships
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere associações" ON public.association_memberships
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza associações" ON public.association_memberships
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove associações" ON public.association_memberships
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- membership_review_notes
DROP POLICY IF EXISTS "Diretoria le observacoes internas" ON public.membership_review_notes;
CREATE POLICY "Diretoria le observacoes internas" ON public.membership_review_notes
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- announcements
DROP POLICY IF EXISTS "Público lê avisos públicos publicados" ON public.announcements;
DROP POLICY IF EXISTS "Associados leem avisos internos" ON public.announcements;
DROP POLICY IF EXISTS "Diretoria gerencia avisos" ON public.announcements;
DROP POLICY IF EXISTS "Usuarios autenticados leem avisos" ON public.announcements;
DROP POLICY IF EXISTS "Diretoria insere avisos" ON public.announcements;
DROP POLICY IF EXISTS "Diretoria atualiza avisos" ON public.announcements;
DROP POLICY IF EXISTS "Diretoria remove avisos" ON public.announcements;

CREATE POLICY "Público lê avisos públicos publicados" ON public.announcements
  FOR SELECT TO anon
  USING (published AND audience = 'publico');

CREATE POLICY "Usuarios autenticados leem avisos" ON public.announcements
  FOR SELECT TO authenticated
  USING (
    (published AND audience = 'publico')
    OR (published AND audience = 'associados' AND public.has_role((select auth.uid()), 'associado'))
    OR public.has_role((select auth.uid()), 'diretoria')
  );

CREATE POLICY "Diretoria insere avisos" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza avisos" ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove avisos" ON public.announcements
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- events
DROP POLICY IF EXISTS "Público lê eventos publicados" ON public.events;
DROP POLICY IF EXISTS "Diretoria gerencia eventos" ON public.events;
DROP POLICY IF EXISTS "Usuarios autenticados leem eventos" ON public.events;
DROP POLICY IF EXISTS "Diretoria insere eventos" ON public.events;
DROP POLICY IF EXISTS "Diretoria atualiza eventos" ON public.events;
DROP POLICY IF EXISTS "Diretoria remove eventos" ON public.events;

CREATE POLICY "Público lê eventos publicados" ON public.events
  FOR SELECT TO anon
  USING (published);

CREATE POLICY "Usuarios autenticados leem eventos" ON public.events
  FOR SELECT TO authenticated
  USING (published OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere eventos" ON public.events
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza eventos" ON public.events
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove eventos" ON public.events
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- event_registrations
DROP POLICY IF EXISTS "Ver as próprias inscrições" ON public.event_registrations;
DROP POLICY IF EXISTS "Associado se inscreve em evento aberto" ON public.event_registrations;
DROP POLICY IF EXISTS "Cancelar a própria inscrição" ON public.event_registrations;

CREATE POLICY "Ver as próprias inscrições" ON public.event_registrations
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Associado se inscreve em evento aberto" ON public.event_registrations
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (select auth.uid())
    AND status = 'inscrito'
    AND public.has_role((select auth.uid()), 'associado')
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.published AND e.registration_open)
  );

CREATE POLICY "Cancelar a própria inscrição" ON public.event_registrations
  FOR DELETE TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

-- news_articles
DROP POLICY IF EXISTS "Público lê notícias publicadas" ON public.news_articles;
DROP POLICY IF EXISTS "Diretoria gerencia notícias" ON public.news_articles;
DROP POLICY IF EXISTS "Usuarios autenticados leem noticias" ON public.news_articles;
DROP POLICY IF EXISTS "Diretoria insere noticias" ON public.news_articles;
DROP POLICY IF EXISTS "Diretoria atualiza noticias" ON public.news_articles;
DROP POLICY IF EXISTS "Diretoria remove noticias" ON public.news_articles;

CREATE POLICY "Público lê notícias publicadas" ON public.news_articles
  FOR SELECT TO anon
  USING (published);

CREATE POLICY "Usuarios autenticados leem noticias" ON public.news_articles
  FOR SELECT TO authenticated
  USING (published OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere noticias" ON public.news_articles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza noticias" ON public.news_articles
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove noticias" ON public.news_articles
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- sponsors
DROP POLICY IF EXISTS "Público lê apoiadores publicados" ON public.sponsors;
DROP POLICY IF EXISTS "Diretoria gerencia apoiadores" ON public.sponsors;
DROP POLICY IF EXISTS "Usuarios autenticados leem apoiadores" ON public.sponsors;
DROP POLICY IF EXISTS "Diretoria insere apoiadores" ON public.sponsors;
DROP POLICY IF EXISTS "Diretoria atualiza apoiadores" ON public.sponsors;
DROP POLICY IF EXISTS "Diretoria remove apoiadores" ON public.sponsors;

CREATE POLICY "Público lê apoiadores publicados" ON public.sponsors
  FOR SELECT TO anon
  USING (published);

CREATE POLICY "Usuarios autenticados leem apoiadores" ON public.sponsors
  FOR SELECT TO authenticated
  USING (published OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere apoiadores" ON public.sponsors
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza apoiadores" ON public.sponsors
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove apoiadores" ON public.sponsors
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- financial_categories, financial_transactions, financial_attachments
DROP POLICY IF EXISTS "Diretoria gerencia categorias" ON public.financial_categories;
CREATE POLICY "Diretoria gerencia categorias" ON public.financial_categories
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

DROP POLICY IF EXISTS "Diretoria seleciona lançamentos" ON public.financial_transactions;
DROP POLICY IF EXISTS "Diretoria insere lançamentos" ON public.financial_transactions;
DROP POLICY IF EXISTS "Diretoria atualiza lançamentos" ON public.financial_transactions;

CREATE POLICY "Diretoria seleciona lançamentos" ON public.financial_transactions
  FOR SELECT TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere lançamentos" ON public.financial_transactions
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza lançamentos" ON public.financial_transactions
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

DROP POLICY IF EXISTS "Diretoria gerencia comprovantes" ON public.financial_attachments;
CREATE POLICY "Diretoria gerencia comprovantes" ON public.financial_attachments
  FOR ALL TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

-- site_content
DROP POLICY IF EXISTS "Publico le conteudo do site" ON public.site_content;
DROP POLICY IF EXISTS "Diretoria gerencia conteudo do site" ON public.site_content;
DROP POLICY IF EXISTS "Diretoria insere conteudo do site" ON public.site_content;
DROP POLICY IF EXISTS "Diretoria atualiza conteudo do site" ON public.site_content;
DROP POLICY IF EXISTS "Diretoria remove conteudo do site" ON public.site_content;

CREATE POLICY "Publico le conteudo do site" ON public.site_content
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Diretoria insere conteudo do site" ON public.site_content
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza conteudo do site" ON public.site_content
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove conteudo do site" ON public.site_content
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- site_projects
DROP POLICY IF EXISTS "Publico le projetos publicados" ON public.site_projects;
DROP POLICY IF EXISTS "Diretoria gerencia projetos" ON public.site_projects;
DROP POLICY IF EXISTS "Usuarios autenticados leem projetos" ON public.site_projects;
DROP POLICY IF EXISTS "Diretoria insere projetos" ON public.site_projects;
DROP POLICY IF EXISTS "Diretoria atualiza projetos" ON public.site_projects;
DROP POLICY IF EXISTS "Diretoria remove projetos" ON public.site_projects;

CREATE POLICY "Publico le projetos publicados" ON public.site_projects
  FOR SELECT TO anon
  USING (published = true);

CREATE POLICY "Usuarios autenticados leem projetos" ON public.site_projects
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere projetos" ON public.site_projects
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza projetos" ON public.site_projects
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove projetos" ON public.site_projects
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- competition_results
DROP POLICY IF EXISTS "Publico le resultados publicados" ON public.competition_results;
DROP POLICY IF EXISTS "Diretoria gerencia resultados" ON public.competition_results;
DROP POLICY IF EXISTS "Usuarios autenticados leem resultados" ON public.competition_results;
DROP POLICY IF EXISTS "Diretoria insere resultados" ON public.competition_results;
DROP POLICY IF EXISTS "Diretoria atualiza resultados" ON public.competition_results;
DROP POLICY IF EXISTS "Diretoria remove resultados" ON public.competition_results;

CREATE POLICY "Publico le resultados publicados" ON public.competition_results
  FOR SELECT TO anon
  USING (published = true);

CREATE POLICY "Usuarios autenticados leem resultados" ON public.competition_results
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere resultados" ON public.competition_results
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza resultados" ON public.competition_results
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove resultados" ON public.competition_results
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- gallery_photos
DROP POLICY IF EXISTS "Publico le fotos publicadas" ON public.gallery_photos;
DROP POLICY IF EXISTS "Diretoria gerencia fotos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Usuarios autenticados leem fotos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Diretoria insere fotos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Diretoria atualiza fotos" ON public.gallery_photos;
DROP POLICY IF EXISTS "Diretoria remove fotos" ON public.gallery_photos;

CREATE POLICY "Publico le fotos publicadas" ON public.gallery_photos
  FOR SELECT TO anon
  USING (published = true);

CREATE POLICY "Usuarios autenticados leem fotos" ON public.gallery_photos
  FOR SELECT TO authenticated
  USING (published = true OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere fotos" ON public.gallery_photos
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza fotos" ON public.gallery_photos
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove fotos" ON public.gallery_photos
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- associate_profiles
DROP POLICY IF EXISTS "Associado ve proprio perfil ou diretoria" ON public.associate_profiles;
DROP POLICY IF EXISTS "Associado cria proprio perfil" ON public.associate_profiles;
DROP POLICY IF EXISTS "Associado edita proprio perfil" ON public.associate_profiles;

CREATE POLICY "Associado ve proprio perfil ou diretoria" ON public.associate_profiles
  FOR SELECT TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Associado cria proprio perfil" ON public.associate_profiles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Associado edita proprio perfil" ON public.associate_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

-- skater_profiles
DROP POLICY IF EXISTS "Publico visualiza perfis de skatistas ativos" ON public.skater_profiles;
DROP POLICY IF EXISTS "Usuarios autenticados visualizam perfis de skatistas" ON public.skater_profiles;
DROP POLICY IF EXISTS "Skatista cria proprio perfil competitivo" ON public.skater_profiles;
DROP POLICY IF EXISTS "Skatista edita dados pessoais permitidos" ON public.skater_profiles;

CREATE POLICY "Publico visualiza perfis de skatistas ativos" ON public.skater_profiles
  FOR SELECT TO anon
  USING (is_active = true);

CREATE POLICY "Usuarios autenticados visualizam perfis de skatistas" ON public.skater_profiles
  FOR SELECT TO authenticated
  USING (
    is_active = true
    OR user_id = (select auth.uid())
    OR public.has_role((select auth.uid()), 'diretoria')
  );

CREATE POLICY "Skatista cria proprio perfil competitivo" ON public.skater_profiles
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      user_id = (select auth.uid())
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = (select auth.uid()) AND p.account_type = 'skatista'
      )
      AND total_points = 0
      AND first_places = 0
      AND second_places = 0
      AND third_places = 0
    )
    OR public.has_role((select auth.uid()), 'diretoria')
  );

CREATE POLICY "Skatista edita dados pessoais permitidos" ON public.skater_profiles
  FOR UPDATE TO authenticated
  USING (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (user_id = (select auth.uid()) OR public.has_role((select auth.uid()), 'diretoria'));

-- ranking_scoring_config
DROP POLICY IF EXISTS "Publico le configuracao de pontuacao" ON public.ranking_scoring_config;
DROP POLICY IF EXISTS "Diretoria altera configuracao de pontuacao" ON public.ranking_scoring_config;
DROP POLICY IF EXISTS "Diretoria insere configuracao de pontuacao" ON public.ranking_scoring_config;
DROP POLICY IF EXISTS "Diretoria atualiza configuracao de pontuacao" ON public.ranking_scoring_config;

CREATE POLICY "Publico le configuracao de pontuacao" ON public.ranking_scoring_config
  FOR SELECT TO anon, authenticated
  USING (true);

CREATE POLICY "Diretoria insere configuracao de pontuacao" ON public.ranking_scoring_config
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza configuracao de pontuacao" ON public.ranking_scoring_config
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

-- championship_podiums
DROP POLICY IF EXISTS "Publico le podios publicados" ON public.championship_podiums;
DROP POLICY IF EXISTS "Diretoria gerencia podios de campeonatos" ON public.championship_podiums;
DROP POLICY IF EXISTS "Usuarios autenticados leem podios" ON public.championship_podiums;
DROP POLICY IF EXISTS "Diretoria insere podios de campeonatos" ON public.championship_podiums;
DROP POLICY IF EXISTS "Diretoria atualiza podios de campeonatos" ON public.championship_podiums;
DROP POLICY IF EXISTS "Diretoria remove podios de campeonatos" ON public.championship_podiums;

CREATE POLICY "Publico le podios publicados" ON public.championship_podiums
  FOR SELECT TO anon
  USING (status = 'publicado');

CREATE POLICY "Usuarios autenticados leem podios" ON public.championship_podiums
  FOR SELECT TO authenticated
  USING (status = 'publicado' OR public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria insere podios de campeonatos" ON public.championship_podiums
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria atualiza podios de campeonatos" ON public.championship_podiums
  FOR UPDATE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'))
  WITH CHECK (public.has_role((select auth.uid()), 'diretoria'));

CREATE POLICY "Diretoria remove podios de campeonatos" ON public.championship_podiums
  FOR DELETE TO authenticated
  USING (public.has_role((select auth.uid()), 'diretoria'));

-- 5. Garantir bootstrap automático de Diretoria para o administrador proprietário do projeto
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text := left(btrim(coalesce(NEW.raw_user_meta_data->>'full_name', '')), 100);
  v_account_type_raw text := lower(btrim(coalesce(NEW.raw_user_meta_data->>'account_type', 'associado')));
  v_modality_raw text := lower(btrim(coalesce(NEW.raw_user_meta_data->>'modality', 'street')));
  v_years text := left(btrim(coalesce(NEW.raw_user_meta_data->>'years_practicing', '')), 60);
  v_trick text := left(btrim(coalesce(NEW.raw_user_meta_data->>'favorite_trick', '')), 100);
  v_stance_raw text := lower(btrim(coalesce(NEW.raw_user_meta_data->>'stance', '')));
  v_stance text := NULL;
  v_age_raw text := btrim(coalesce(NEW.raw_user_meta_data->>'age', ''));
  v_age int := NULL;
  v_account_type public.account_kind := 'associado';
  v_modality public.skate_modality := 'street';
BEGIN
  IF v_full_name = '' THEN
    v_full_name := split_part(coalesce(NEW.email, 'Skatista'), '@', 1);
  END IF;

  IF v_account_type_raw = 'skatista' THEN
    v_account_type := 'skatista';
  ELSE
    v_account_type := 'associado';
  END IF;

  IF v_modality_raw = 'vert' THEN
    v_modality := 'vert';
  ELSIF v_modality_raw = 'versatil' THEN
    v_modality := 'versatil';
  ELSIF v_modality_raw = 'escolher_depois' THEN
    v_modality := 'escolher_depois';
  ELSE
    v_modality := 'street';
  END IF;

  IF v_stance_raw IN ('regular', 'goofy') THEN
    v_stance := v_stance_raw;
  END IF;

  IF v_age_raw ~ '^[0-9]{1,3}$' THEN
    v_age := v_age_raw::int;
    IF v_age < 4 OR v_age > 100 THEN
      v_age := NULL;
    END IF;
  END IF;

  INSERT INTO public.profiles (id, full_name, account_type, age)
  VALUES (NEW.id, v_full_name, v_account_type, v_age)
  ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        account_type = EXCLUDED.account_type,
        age = coalesce(EXCLUDED.age, public.profiles.age);

  IF v_account_type = 'skatista' THEN
    INSERT INTO public.skater_profiles (
      user_id,
      full_name,
      age,
      years_practicing,
      favorite_trick,
      stance,
      modality
    )
    VALUES (
      NEW.id,
      v_full_name,
      v_age,
      v_years,
      v_trick,
      v_stance,
      v_modality
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.associate_profiles (user_id, full_name, age)
    VALUES (NEW.id, v_full_name, v_age)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  -- Bootstrap administrativo para o proprietário da conta oficial
  IF lower(coalesce(NEW.email, '')) IN ('lucas.san10@live.com', 'lucassan2336@gmail.com') THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'diretoria'), (NEW.id, 'associado')
    ON CONFLICT (user_id, role) DO NOTHING;

    INSERT INTO public.association_memberships (user_id, status, member_since)
    VALUES (NEW.id, 'ativa', current_date)
    ON CONFLICT (user_id) DO UPDATE SET status = 'ativa', updated_at = now();
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- 6. Habilitar sincronização em tempo real (supabase_realtime) para todas as tabelas públicas do site
DO $$
DECLARE
  v_table text;
BEGIN
  FOREACH v_table IN ARRAY ARRAY[
    'site_content',
    'site_projects',
    'competition_results',
    'gallery_photos',
    'news_articles',
    'events',
    'sponsors',
    'announcements',
    'championship_podiums',
    'ranking_scoring_config',
    'skater_profiles',
    'associate_profiles',
    'profiles',
    'membership_applications',
    'association_memberships',
    'user_roles',
    'event_registrations'
  ]
  LOOP
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = v_table
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
    END IF;
  END LOOP;
END $$;


