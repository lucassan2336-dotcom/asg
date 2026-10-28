-- Migration: 0010_expand_skater_modalities.sql
-- Expande modalidades de skatistas com 'versatil' (Street + Vert) e 'escolher_depois' (Em Aberto)

DO $$
BEGIN
  ALTER TYPE public.skate_modality ADD VALUE IF NOT EXISTS 'versatil';
  ALTER TYPE public.skate_modality ADD VALUE IF NOT EXISTS 'escolher_depois';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 1. Atualiza handle_new_user()
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

  RETURN NEW;
END;
$$;

-- 2. Atualiza validação de pódio para campeonatos
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
  IF NEW.first_place_skater_id = NEW.second_place_skater_id
     OR NEW.first_place_skater_id = NEW.third_place_skater_id
     OR NEW.second_place_skater_id = NEW.third_place_skater_id THEN
    RAISE EXCEPTION 'O mesmo skatista não pode ocupar mais de uma colocação no mesmo campeonato.'
      USING ERRCODE = '23514';
  END IF;

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

  IF (v_mod1 <> NEW.modality AND v_mod1 <> 'versatil')
     OR (v_mod2 <> NEW.modality AND v_mod2 <> 'versatil')
     OR (v_mod3 <> NEW.modality AND v_mod3 <> 'versatil') THEN
    RAISE EXCEPTION 'Todos os colocados do pódio devem pertencer à modalidade % (ou versátil).', upper(NEW.modality::text)
      USING ERRCODE = '22023';
  END IF;

  IF NEW.first_points < 0 OR NEW.second_points < 0 OR NEW.third_points < 0 THEN
    RAISE EXCEPTION 'A pontuação das colocações não pode ser negativa.' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. Atualiza recálculo geral de pontos
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
      AND (s.modality = 'versatil' OR cp.modality = s.modality)
      AND (
        cp.first_place_skater_id = s.id
        OR cp.second_place_skater_id = s.id
        OR cp.third_place_skater_id = s.id
      )
    WHERE s.modality <> 'escolher_depois'
    GROUP BY s.id
  ) calc
  WHERE sp.id = calc.skater_id
    AND (
      sp.total_points IS DISTINCT FROM coalesce(calc.pts, 0)
      OR sp.first_places IS DISTINCT FROM coalesce(calc.p1, 0)
      OR sp.second_places IS DISTINCT FROM coalesce(calc.p2, 0)
      OR sp.third_places IS DISTINCT FROM coalesce(calc.p3, 0)
    );

  UPDATE public.skater_profiles
  SET total_points = 0, first_places = 0, second_places = 0, third_places = 0, updated_at = now()
  WHERE modality = 'escolher_depois'
    AND (total_points <> 0 OR first_places <> 0 OR second_places <> 0 OR third_places <> 0);

  PERFORM set_config('asg.internal_ranking_recalc', 'false', true);
END;
$$;

-- 4. Atualiza get_modality_ranking para aceitar versáteis nos dois rankings e ignorar escolher_depois
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
SECURITY DEFINER
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

-- 5. Atualiza get_skater_championship_history
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
    AND (sp.modality = 'versatil' OR cp.modality = sp.modality)
    AND (
      cp.first_place_skater_id = _skater_id
      OR cp.second_place_skater_id = _skater_id
      OR cp.third_place_skater_id = _skater_id
    )
  ORDER BY cp.event_date DESC, cp.created_at DESC;
$$;
