-- Permissões e políticas RLS em user_roles e association_memberships para Diretoria
GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.association_memberships TO authenticated;

DROP POLICY IF EXISTS "Diretoria gerencia papéis" ON public.user_roles;
CREATE POLICY "Diretoria gerencia papéis"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria'))
  WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

DROP POLICY IF EXISTS "Diretoria gerencia associações" ON public.association_memberships;
CREATE POLICY "Diretoria gerencia associações"
  ON public.association_memberships
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria'))
  WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- Trigger de segurança em user_roles para impedir auto-remoção da função de diretoria
CREATE OR REPLACE FUNCTION public.prevent_self_diretoria_revocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role = 'diretoria' AND OLD.user_id = auth.uid() THEN
    RAISE EXCEPTION 'Você não pode remover sua própria função de diretoria.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_diretoria_revocation ON public.user_roles;
CREATE TRIGGER trg_prevent_self_diretoria_revocation
  BEFORE DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_self_diretoria_revocation();

-- Função segura para listar cadastros com e-mail, perfil, papéis e status associativo (apenas Diretoria)
CREATE OR REPLACE FUNCTION public.list_registered_users_for_diretoria()
RETURNS TABLE (
  user_id uuid,
  email text,
  full_name text,
  phone text,
  birth_date date,
  created_at timestamptz,
  is_associado boolean,
  is_diretoria boolean,
  membership_status text,
  member_since date
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado: exclusivo da diretoria.'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    u.id AS user_id,
    coalesce(u.email::text, '') AS email,
    coalesce(
      nullif(trim(p.full_name), ''),
      nullif(trim(ma.full_name), ''),
      split_part(coalesce(u.email::text, 'Sem nome'), '@', 1)
    ) AS full_name,
    coalesce(p.phone, ma.phone) AS phone,
    coalesce(p.birth_date, ma.birth_date) AS birth_date,
    coalesce(p.created_at, now()) AS created_at,
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = u.id AND ur.role = 'associado'
    ) AS is_associado,
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = u.id AND ur.role = 'diretoria'
    ) AS is_diretoria,
    am.status::text AS membership_status,
    am.member_since
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  LEFT JOIN public.association_memberships am ON am.user_id = u.id
  LEFT JOIN LATERAL (
    SELECT m.full_name, m.phone, m.birth_date
    FROM public.membership_applications m
    WHERE m.user_id = u.id
    ORDER BY m.created_at DESC
    LIMIT 1
  ) ma ON true
  ORDER BY coalesce(p.created_at, now()) DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.list_registered_users_for_diretoria() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_registered_users_for_diretoria() TO authenticated;

-- Função segura para atribuir ou revogar função (diretoria / associado) de um cadastro
CREATE OR REPLACE FUNCTION public.set_user_role_by_diretoria(
  _target_user_id uuid,
  _role public.app_role,
  _grant boolean,
  _notes text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_clean_notes text := nullif(trim(coalesce(_notes, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado: apenas membros da diretoria podem alterar funções de cadastros.'
      USING ERRCODE = '42501';
  END IF;

  IF _target_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário alvo inválido.'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _target_user_id) THEN
    RAISE EXCEPTION 'Cadastro de usuário não encontrado.'
      USING ERRCODE = 'P0002';
  END IF;

  IF _target_user_id = auth.uid() AND _role = 'diretoria' AND NOT _grant THEN
    RAISE EXCEPTION 'Operação bloqueada: você não pode remover sua própria função de diretoria.'
      USING ERRCODE = '42501';
  END IF;

  IF _grant THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (_target_user_id, _role)
    ON CONFLICT (user_id, role) DO NOTHING;

    IF _role = 'associado' THEN
      INSERT INTO public.association_memberships (user_id, status, member_since)
      VALUES (_target_user_id, 'ativa', current_date)
      ON CONFLICT (user_id) DO UPDATE SET status = 'ativa', updated_at = now();
    END IF;
  ELSE
    DELETE FROM public.user_roles
    WHERE user_id = _target_user_id AND role = _role;

    IF _role = 'associado' THEN
      UPDATE public.association_memberships
      SET status = 'encerrada', updated_at = now()
      WHERE user_id = _target_user_id AND status = 'ativa';
    END IF;
  END IF;

  PERFORM public.write_audit(
    CASE WHEN _grant THEN 'conceder_funcao_' || _role::text ELSE 'revogar_funcao_' || _role::text END,
    'user_roles',
    _target_user_id,
    jsonb_build_object(
      'target_user_id', _target_user_id,
      'role', _role::text,
      'granted', _grant,
      'notes', left(coalesce(v_clean_notes, ''), 500)
    )
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_user_role_by_diretoria(uuid, public.app_role, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_user_role_by_diretoria(uuid, public.app_role, boolean, text) TO authenticated;