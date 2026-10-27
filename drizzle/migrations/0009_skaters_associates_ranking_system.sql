-- ============================================================================
-- MIGRATION 0009: Sistema de Skatistas, Associados, Resultados e Ranking (A.S.G.)
-- 1. Dois tipos de conta: 'skatista' (Street ou Vert) e 'associado'
-- 2. Perfis separados: skater_profiles (competitivo) e associate_profiles (associativo)
-- 3. Configuração centralizada de pontuação e critério de desempate
-- 4. Campeonatos e pódios oficiais vinculados aos skatistas cadastrados
-- 5. Cálculo automático de pontuação, desempate e compartilhamento de posição
-- 6. Segurança RLS, bloqueio de adulteração de pontos/modalidade e privacidade
-- ============================================================================

-- 1. Enums para tipo de conta e modalidade esportiva
DO $$ BEGIN
  CREATE TYPE public.account_kind AS ENUM ('skatista', 'associado');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.skate_modality AS ENUM ('street', 'vert');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Expansão segura da tabela public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type public.account_kind NOT NULL DEFAULT 'associado',
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS age int CHECK (age IS NULL OR (age BETWEEN 4 AND 100)),
  ADD COLUMN IF NOT EXISTS show_age_publicly boolean NOT NULL DEFAULT true;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_avatar_url_protocol_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_avatar_url_protocol_check
  CHECK (
    avatar_url IS NULL
    OR avatar_url ~ '^https?://'
    OR avatar_url ~ '^/'
    OR avatar_url ~ '^data:image/(jpeg|png|webp);base64,'
  );

-- Impedir que usuário comum altere seu próprio account_type após criação sem ser da diretoria
CREATE OR REPLACE FUNCTION public.protect_profile_account_type()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.account_type IS DISTINCT FROM OLD.account_type THEN
    IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'diretoria') THEN
      RAISE EXCEPTION 'Não é permitido alterar o tipo de conta sem autorização da diretoria.'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_account_type ON public.profiles;
CREATE TRIGGER trg_protect_profile_account_type
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_account_type();

-- 3. Tabela de Perfis de Associados (separada do perfil competitivo)
CREATE TABLE IF NOT EXISTS public.associate_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '' CHECK (char_length(btrim(full_name)) <= 100),
  avatar_url text,
  age int CHECK (age IS NULL OR (age BETWEEN 4 AND 100)),
  associate_notes text CHECK (associate_notes IS NULL OR char_length(associate_notes) <= 500),
  associate_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT associate_profiles_avatar_protocol_check CHECK (
    avatar_url IS NULL
    OR avatar_url ~ '^https?://'
    OR avatar_url ~ '^/'
    OR avatar_url ~ '^data:image/(jpeg|png|webp);base64,'
  )
);

GRANT SELECT, INSERT, UPDATE ON public.associate_profiles TO authenticated;
GRANT ALL ON public.associate_profiles TO service_role;
ALTER TABLE public.associate_profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_associate_profiles_updated ON public.associate_profiles;
CREATE TRIGGER trg_associate_profiles_updated
  BEFORE UPDATE ON public.associate_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Associado ve proprio perfil ou diretoria" ON public.associate_profiles;
CREATE POLICY "Associado ve proprio perfil ou diretoria"
  ON public.associate_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));

DROP POLICY IF EXISTS "Associado cria proprio perfil" ON public.associate_profiles;
CREATE POLICY "Associado cria proprio perfil"
  ON public.associate_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));

DROP POLICY IF EXISTS "Associado edita proprio perfil" ON public.associate_profiles;
CREATE POLICY "Associado edita proprio perfil"
  ON public.associate_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));

-- 4. Tabela de Perfis Competitivos de Skatistas (Street / Vert)
CREATE TABLE IF NOT EXISTS public.skater_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (char_length(btrim(full_name)) BETWEEN 2 AND 100),
  avatar_url text,
  age int CHECK (age IS NULL OR (age BETWEEN 4 AND 100)),
  show_age_publicly boolean NOT NULL DEFAULT true,
  years_practicing text NOT NULL DEFAULT '' CHECK (char_length(years_practicing) <= 60),
  favorite_trick text NOT NULL DEFAULT '' CHECK (char_length(favorite_trick) <= 100),
  modality public.skate_modality NOT NULL,
  bio text CHECK (bio IS NULL OR char_length(bio) <= 500),
  -- Totais sincronizados automaticamente a partir dos campeonatos publicados (bloqueados contra edição manual)
  total_points int NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  first_places int NOT NULL DEFAULT 0 CHECK (first_places >= 0),
  second_places int NOT NULL DEFAULT 0 CHECK (second_places >= 0),
  third_places int NOT NULL DEFAULT 0 CHECK (third_places >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT skater_profiles_avatar_protocol_check CHECK (
    avatar_url IS NULL
    OR avatar_url ~ '^https?://'
    OR avatar_url ~ '^/'
    OR avatar_url ~ '^data:image/(jpeg|png|webp);base64,'
  )
);

CREATE INDEX IF NOT EXISTS idx_skater_profiles_modality_ranking
  ON public.skater_profiles (modality, is_active, total_points DESC, first_places DESC, second_places DESC, third_places DESC);

GRANT SELECT ON public.skater_profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON public.skater_profiles TO authenticated;
GRANT ALL ON public.skater_profiles TO service_role;
ALTER TABLE public.skater_profiles ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_skater_profiles_updated ON public.skater_profiles;
CREATE TRIGGER trg_skater_profiles_updated
  BEFORE UPDATE ON public.skater_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Políticas RLS de skater_profiles
DROP POLICY IF EXISTS "Publico visualiza perfis de skatistas ativos" ON public.skater_profiles;
CREATE POLICY "Publico visualiza perfis de skatistas ativos"
  ON public.skater_profiles
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    OR user_id = auth.uid()
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'diretoria'))
  );

DROP POLICY IF EXISTS "Skatista cria proprio perfil competitivo" ON public.skater_profiles;
CREATE POLICY "Skatista cria proprio perfil competitivo"
  ON public.skater_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      user_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.account_type = 'skatista'
      )
      AND total_points = 0
      AND first_places = 0
      AND second_places = 0
      AND third_places = 0
    )
    OR public.has_role(auth.uid(), 'diretoria')
  );

DROP POLICY IF EXISTS "Skatista edita dados pessoais permitidos" ON public.skater_profiles;
CREATE POLICY "Skatista edita dados pessoais permitidos"
  ON public.skater_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));

-- Trigger para impedir que skatistas comuns alterem pontos, pódios, modalidade ou status ativo
CREATE OR REPLACE FUNCTION public.protect_skater_competitive_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_internal_recalc text := current_setting('asg.internal_ranking_recalc', true);
  v_is_diretoria boolean := (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'diretoria'));
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF v_internal_recalc IS DISTINCT FROM 'true' THEN
      NEW.total_points := 0;
      NEW.first_places := 0;
      NEW.second_places := 0;
      NEW.third_places := 0;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- Pontuação e contagem de pódios SÓ podem ser alteradas pelo motor automático de recálculo
    IF v_internal_recalc IS DISTINCT FROM 'true' THEN
      IF NEW.total_points IS DISTINCT FROM OLD.total_points
         OR NEW.first_places IS DISTINCT FROM OLD.first_places
         OR NEW.second_places IS DISTINCT FROM OLD.second_places
         OR NEW.third_places IS DISTINCT FROM OLD.third_places THEN
        RAISE EXCEPTION 'Operação negada: a pontuação e os pódios oficiais são calculados automaticamente pelos resultados dos campeonatos.'
          USING ERRCODE = '42501';
      END IF;
    END IF;

    -- Modalidade principal e status ativo SÓ podem ser alterados pela diretoria
    IF NOT v_is_diretoria AND v_internal_recalc IS DISTINCT FROM 'true' THEN
      IF NEW.modality IS DISTINCT FROM OLD.modality THEN
        RAISE EXCEPTION 'Operação negada: a modalidade competitiva (Street/Vert) não pode ser alterada sem autorização da diretoria.'
          USING ERRCODE = '42501';
      END IF;
      IF NEW.is_active IS DISTINCT FROM OLD.is_active OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
        RAISE EXCEPTION 'Operação negada: alteração restrita à diretoria.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_skater_competitive_fields ON public.skater_profiles;
CREATE TRIGGER trg_protect_skater_competitive_fields
  BEFORE INSERT OR UPDATE ON public.skater_profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_skater_competitive_fields();

-- 5. Atualização da trigger handle_new_user() para criar automaticamente o perfil correto no cadastro
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
  ELSE
    v_modality := 'street';
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
      modality
    )
    VALUES (
      NEW.id,
      v_full_name,
      v_age,
      v_years,
      v_trick,
      v_modality
    )
    ON CONFLICT (user_id) DO NOTHING;
  ELSE
    INSERT INTO public.associate_profiles (
      user_id,
      full_name,
      age
    )
    VALUES (
      NEW.id,
      v_full_name,
      v_age
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- 6. Tabela de Configuração Centralizada de Pontuação e Desempate (Editável pela Diretoria)
CREATE TABLE IF NOT EXISTS public.ranking_scoring_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  first_place_points int NOT NULL DEFAULT 1000 CHECK (first_place_points > 0 AND first_place_points <= 100000),
  second_place_points int NOT NULL DEFAULT 750 CHECK (second_place_points >= 0 AND second_place_points <= 100000),
  third_place_points int NOT NULL DEFAULT 500 CHECK (third_place_points >= 0 AND third_place_points <= 100000),
  tiebreaker_rule text NOT NULL DEFAULT 'podium_counts' CHECK (tiebreaker_rule IN ('podium_counts', 'shared_position_only')),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scoring_order_check CHECK (
    first_place_points >= second_place_points AND second_place_points >= third_place_points
  )
);

INSERT INTO public.ranking_scoring_config (id, first_place_points, second_place_points, third_place_points, tiebreaker_rule)
VALUES (1, 1000, 750, 500, 'podium_counts')
ON CONFLICT (id) DO NOTHING;

GRANT SELECT ON public.ranking_scoring_config TO anon, authenticated;
GRANT INSERT, UPDATE ON public.ranking_scoring_config TO authenticated;
GRANT ALL ON public.ranking_scoring_config TO service_role;
ALTER TABLE public.ranking_scoring_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Publico le configuracao de pontuacao" ON public.ranking_scoring_config;
CREATE POLICY "Publico le configuracao de pontuacao"
  ON public.ranking_scoring_config
  FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "Diretoria altera configuracao de pontuacao" ON public.ranking_scoring_config;
CREATE POLICY "Diretoria altera configuracao de pontuacao"
  ON public.ranking_scoring_config
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria'))
  WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

DROP TRIGGER IF EXISTS audit_ranking_scoring_config ON public.ranking_scoring_config;
CREATE TRIGGER audit_ranking_scoring_config
  AFTER INSERT OR UPDATE ON public.ranking_scoring_config
  FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- 7. Tabela Oficial de Resultados de Campeonatos por Modalidade (Street / Vert)
CREATE TABLE IF NOT EXISTS public.championship_podiums (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_name text NOT NULL CHECK (char_length(btrim(championship_name)) BETWEEN 2 AND 160),
  event_date date NOT NULL,
  modality public.skate_modality NOT NULL,
  first_place_skater_id uuid NOT NULL REFERENCES public.skater_profiles(id) ON DELETE RESTRICT,
  second_place_skater_id uuid NOT NULL REFERENCES public.skater_profiles(id) ON DELETE RESTRICT,
  third_place_skater_id uuid NOT NULL REFERENCES public.skater_profiles(id) ON DELETE RESTRICT,
  first_points int NOT NULL CHECK (first_points > 0 AND first_points <= 100000),
  second_points int NOT NULL CHECK (second_points >= 0 AND second_points <= 100000),
  third_points int NOT NULL CHECK (third_points >= 0 AND third_points <= 100000),
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  status text NOT NULL DEFAULT 'publicado' CHECK (status IN ('publicado', 'cancelado')),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT podium_distinct_skaters_check CHECK (
    first_place_skater_id <> second_place_skater_id
    AND first_place_skater_id <> third_place_skater_id
    AND second_place_skater_id <> third_place_skater_id
  ),
  CONSTRAINT podium_points_order_check CHECK (
    first_points >= second_points AND second_points >= third_points
  )
);

-- Evitar que o mesmo campeonato (nome + data + modalidade) seja contabilizado duas vezes enquanto publicado
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_championship_podium
  ON public.championship_podiums (lower(btrim(championship_name)), event_date, modality)
  WHERE status = 'publicado';

GRANT SELECT ON public.championship_podiums TO anon, authenticated;
GRANT INSERT, UPDATE ON public.championship_podiums TO authenticated;
GRANT ALL ON public.championship_podiums TO service_role;
ALTER TABLE public.championship_podiums ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_championship_podiums_updated ON public.championship_podiums;
CREATE TRIGGER trg_championship_podiums_updated
  BEFORE UPDATE ON public.championship_podiums
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP POLICY IF EXISTS "Publico le podios publicados" ON public.championship_podiums;
CREATE POLICY "Publico le podios publicados"
  ON public.championship_podiums
  FOR SELECT
  TO anon, authenticated
  USING (
    status = 'publicado'
    OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'diretoria'))
  );

DROP POLICY IF EXISTS "Diretoria gerencia podios de campeonatos" ON public.championship_podiums;
CREATE POLICY "Diretoria gerencia podios de campeonatos"
  ON public.championship_podiums
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria'))
  WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- 8. Validação de modalidade dos participantes do pódio (Street só pontua em Street; Vert só em Vert)
CREATE OR REPLACE FUNCTION public.validate_championship_podium()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_mod1 public.skate_modality;
  v_mod2 public.skate_modality;
  v_mod3 public.skate_modality;
BEGIN
  SELECT modality INTO v_mod1 FROM public.skater_profiles WHERE id = NEW.first_place_skater_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'O 1º colocado selecionado não possui perfil de skatista ativo.'
      USING ERRCODE = '22023';
  END IF;

  SELECT modality INTO v_mod2 FROM public.skater_profiles WHERE id = NEW.second_place_skater_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'O 2º colocado selecionado não possui perfil de skatista ativo.'
      USING ERRCODE = '22023';
  END IF;

  SELECT modality INTO v_mod3 FROM public.skater_profiles WHERE id = NEW.third_place_skater_id AND is_active = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'O 3º colocado selecionado não possui perfil de skatista ativo.'
      USING ERRCODE = '22023';
  END IF;

  IF v_mod1 <> NEW.modality OR v_mod2 <> NEW.modality OR v_mod3 <> NEW.modality THEN
    RAISE EXCEPTION 'Todos os colocados do pódio devem pertencer à modalidade % do campeonato.', upper(NEW.modality::text)
      USING ERRCODE = '22023';
  END IF;

  NEW.championship_name := btrim(NEW.championship_name);
  IF TG_OP = 'INSERT' AND NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  NEW.updated_by := auth.uid();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_championship_podium ON public.championship_podiums;
CREATE TRIGGER trg_validate_championship_podium
  BEFORE INSERT OR UPDATE ON public.championship_podiums
  FOR EACH ROW EXECUTE FUNCTION public.validate_championship_podium();

-- 9. Função Centralizada de Recálculo Automático da Pontuação e Pódios
CREATE OR REPLACE FUNCTION public.recalculate_all_skater_rankings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('asg.internal_ranking_recalc', 'true', true);

  UPDATE public.skater_profiles sp
  SET
    total_points = coalesce(calc.pts, 0),
    first_places = coalesce(calc.p1, 0),
    second_places = coalesce(calc.p2, 0),
    third_places = coalesce(calc.p3, 0),
    updated_at = now()
  FROM (
    SELECT
      s.id AS skater_id,
      sum(
        CASE
          WHEN cp.id IS NULL THEN 0
          WHEN cp.first_place_skater_id = s.id THEN cp.first_points
          WHEN cp.second_place_skater_id = s.id THEN cp.second_points
          WHEN cp.third_place_skater_id = s.id THEN cp.third_points
          ELSE 0
        END
      )::int AS pts,
      count(*) FILTER (WHERE cp.first_place_skater_id = s.id)::int AS p1,
      count(*) FILTER (WHERE cp.second_place_skater_id = s.id)::int AS p2,
      count(*) FILTER (WHERE cp.third_place_skater_id = s.id)::int AS p3
    FROM public.skater_profiles s
    LEFT JOIN public.championship_podiums cp
      ON cp.status = 'publicado'
      AND cp.modality = s.modality
      AND (
        cp.first_place_skater_id = s.id
        OR cp.second_place_skater_id = s.id
        OR cp.third_place_skater_id = s.id
      )
    GROUP BY s.id
  ) calc
  WHERE sp.id = calc.skater_id
    AND (
      sp.total_points IS DISTINCT FROM coalesce(calc.pts, 0)
      OR sp.first_places IS DISTINCT FROM coalesce(calc.p1, 0)
      OR sp.second_places IS DISTINCT FROM coalesce(calc.p2, 0)
      OR sp.third_places IS DISTINCT FROM coalesce(calc.p3, 0)
    );

  PERFORM set_config('asg.internal_ranking_recalc', 'false', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.recalculate_all_skater_rankings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recalculate_all_skater_rankings() TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_after_championship_podium_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rec_id uuid := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  v_action text;
BEGIN
  PERFORM public.recalculate_all_skater_rankings();

  IF TG_OP = 'INSERT' THEN
    v_action := 'publicar_resultado_campeonato';
  ELSIF TG_OP = 'UPDATE' AND NEW.status = 'cancelado' AND OLD.status <> 'cancelado' THEN
    v_action := 'cancelar_resultado_campeonato';
  ELSE
    v_action := 'atualizar_resultado_campeonato';
  END IF;

  PERFORM public.write_audit(
    v_action,
    'championship_podiums',
    v_rec_id,
    CASE
      WHEN TG_OP = 'DELETE' THEN jsonb_build_object('championship_name', OLD.championship_name, 'modality', OLD.modality)
      ELSE jsonb_build_object(
        'championship_name', NEW.championship_name,
        'modality', NEW.modality,
        'status', NEW.status,
        'first_place_skater_id', NEW.first_place_skater_id,
        'second_place_skater_id', NEW.second_place_skater_id,
        'third_place_skater_id', NEW.third_place_skater_id,
        'first_points', NEW.first_points,
        'second_points', NEW.second_points,
        'third_points', NEW.third_points
      )
    END
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_championship_podium_recalc ON public.championship_podiums;
CREATE TRIGGER trg_championship_podium_recalc
  AFTER INSERT OR UPDATE OR DELETE ON public.championship_podiums
  FOR EACH ROW EXECUTE FUNCTION public.trg_after_championship_podium_change();

-- Quando a modalidade de um skatista é alterada pela diretoria, recalcula pontos imediatamente
CREATE OR REPLACE FUNCTION public.trg_after_skater_modality_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.modality IS DISTINCT FROM NEW.modality THEN
    PERFORM public.recalculate_all_skater_rankings();
    PERFORM public.write_audit(
      'alterar_modalidade_skatista',
      'skater_profiles',
      NEW.id,
      jsonb_build_object('old_modality', OLD.modality, 'new_modality', NEW.modality, 'user_id', NEW.user_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_skater_modality_recalc ON public.skater_profiles;
CREATE TRIGGER trg_skater_modality_recalc
  AFTER UPDATE ON public.skater_profiles
  FOR EACH ROW EXECUTE FUNCTION public.trg_after_skater_modality_change();

-- 10. Função Pública de Ranking por Modalidade (com critério de desempate e posição compartilhada via RANK)
CREATE OR REPLACE FUNCTION public.get_modality_ranking(_modality public.skate_modality)
RETURNS TABLE (
  skater_id uuid,
  user_id uuid,
  full_name text,
  avatar_url text,
  age int,
  years_practicing text,
  favorite_trick text,
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
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tiebreaker text := 'podium_counts';
BEGIN
  SELECT c.tiebreaker_rule INTO v_tiebreaker
  FROM public.ranking_scoring_config c
  WHERE c.id = 1;

  RETURN QUERY
  WITH ranked AS (
    SELECT
      sp.id AS s_id,
      sp.user_id AS u_id,
      sp.full_name AS f_name,
      sp.avatar_url AS av_url,
      CASE WHEN sp.show_age_publicly THEN sp.age ELSE NULL END AS public_age,
      sp.years_practicing AS y_prac,
      sp.favorite_trick AS fav_trick,
      sp.modality AS mod,
      sp.total_points AS pts,
      sp.first_places AS p1,
      sp.second_places AS p2,
      sp.third_places AS p3,
      CASE
        WHEN coalesce(v_tiebreaker, 'podium_counts') = 'podium_counts' THEN
          RANK() OVER (
            ORDER BY
              sp.total_points DESC,
              sp.first_places DESC,
              sp.second_places DESC,
              sp.third_places DESC
          )::int
        ELSE
          RANK() OVER (
            ORDER BY sp.total_points DESC
          )::int
      END AS pos
    FROM public.skater_profiles sp
    WHERE sp.is_active = true
      AND sp.modality = _modality
  )
  SELECT
    r.s_id,
    r.u_id,
    r.f_name,
    r.av_url,
    r.public_age,
    r.y_prac,
    r.fav_trick,
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

GRANT EXECUTE ON FUNCTION public.get_modality_ranking(public.skate_modality) TO anon, authenticated;

-- 11. Função Pública para Consultar Histórico de Campeonatos de um Skatista
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
SECURITY DEFINER
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
    AND cp.modality = sp.modality
    AND (
      cp.first_place_skater_id = _skater_id
      OR cp.second_place_skater_id = _skater_id
      OR cp.third_place_skater_id = _skater_id
    )
  ORDER BY cp.event_date DESC, cp.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_skater_championship_history(uuid) TO anon, authenticated;

-- 12. Função Administrativa para a Diretoria gerenciar modalidade / perfil competitivo de um usuário
CREATE OR REPLACE FUNCTION public.admin_manage_skater_profile(
  _target_user_id uuid,
  _modality public.skate_modality,
  _is_active boolean DEFAULT true
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_skater_id uuid;
  v_name text;
  v_avatar text;
  v_age int;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado: apenas a diretoria pode gerenciar a modalidade ou habilitar perfil competitivo.'
      USING ERRCODE = '42501';
  END IF;

  SELECT
    coalesce(nullif(btrim(p.full_name), ''), split_part(coalesce(u.email::text, 'Skatista'), '@', 1)),
    p.avatar_url,
    p.age
  INTO v_name, v_avatar, v_age
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE u.id = _target_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuário não encontrado.' USING ERRCODE = 'P0002';
  END IF;

  INSERT INTO public.skater_profiles (user_id, full_name, avatar_url, age, modality, is_active)
  VALUES (_target_user_id, v_name, v_avatar, v_age, _modality, _is_active)
  ON CONFLICT (user_id) DO UPDATE
    SET modality = EXCLUDED.modality,
        is_active = EXCLUDED.is_active,
        updated_at = now()
  RETURNING id INTO v_skater_id;

  PERFORM public.recalculate_all_skater_rankings();

  PERFORM public.write_audit(
    'gerenciar_perfil_skatista',
    'skater_profiles',
    v_skater_id,
    jsonb_build_object(
      'target_user_id', _target_user_id,
      'modality', _modality,
      'is_active', _is_active
    )
  );

  RETURN v_skater_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_manage_skater_profile(uuid, public.skate_modality, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_manage_skater_profile(uuid, public.skate_modality, boolean) TO authenticated;

-- 13. Bucket de Avatares para Fotos de Perfil (Supabase Storage quando disponível)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'avatars',
      'avatars',
      true,
      3145728,
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE
      SET public = true,
          file_size_limit = 3145728,
          allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    DROP POLICY IF EXISTS "Publico visualiza avatares" ON storage.objects;
    CREATE POLICY "Publico visualiza avatares"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'avatars');

    DROP POLICY IF EXISTS "Usuario envia proprio avatar" ON storage.objects;
    CREATE POLICY "Usuario envia proprio avatar"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'avatars'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
      );

    DROP POLICY IF EXISTS "Usuario atualiza proprio avatar" ON storage.objects;
    CREATE POLICY "Usuario atualiza proprio avatar"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'avatars'
        AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'diretoria'))
      )
      WITH CHECK (
        bucket_id = 'avatars'
        AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'diretoria'))
      );
  END IF;
END $$;
