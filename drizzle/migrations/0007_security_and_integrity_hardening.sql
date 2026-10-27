-- ===== Migration 0007: Security and Financial Integrity Hardening =====

-- 1. Endurecer public.has_role para impedir enumeração de papéis de terceiros por anônimos ou associados comuns
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN _user_id = auth.uid() THEN
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    WHEN auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'diretoria'
    ) THEN
      EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
    ELSE false
  END
$$;

-- 2. Garantir auditoria automática em qualquer alteração de papéis (user_roles)
DROP TRIGGER IF EXISTS audit_user_roles ON public.user_roles;
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

-- 3. Validar formato de telefone também na tabela profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_phone_format_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_phone_format_check
  CHECK (
    phone IS NULL
    OR btrim(phone) = ''
    OR (phone ~ '^[0-9+() .-]{8,20}$' AND length(regexp_replace(phone, '[^0-9]', '', 'g')) >= 8)
  );

-- 4. Impedir exclusão física (DELETE) de movimentações financeiras por clientes e proteger imutabilidade de cancelados/estornos
REVOKE DELETE ON public.financial_transactions FROM anon, authenticated;

DROP POLICY IF EXISTS "Diretoria gerencia lançamentos" ON public.financial_transactions;
DROP POLICY IF EXISTS "Diretoria seleciona lançamentos" ON public.financial_transactions;
DROP POLICY IF EXISTS "Diretoria insere lançamentos" ON public.financial_transactions;
DROP POLICY IF EXISTS "Diretoria atualiza lançamentos" ON public.financial_transactions;

CREATE POLICY "Diretoria seleciona lançamentos"
ON public.financial_transactions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'diretoria'));

CREATE POLICY "Diretoria insere lançamentos"
ON public.financial_transactions FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

CREATE POLICY "Diretoria atualiza lançamentos"
ON public.financial_transactions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'diretoria'))
WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

CREATE OR REPLACE FUNCTION public.prevent_financial_transaction_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL THEN
    RAISE EXCEPTION 'Exclusão definitiva de lançamento financeiro não é permitida. Utilize o cancelamento ou estorno com justificativa.'
      USING ERRCODE = '42501';
  END IF;
  RETURN OLD;
END; $$;
REVOKE ALL ON FUNCTION public.prevent_financial_transaction_delete() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_prevent_financial_tx_delete ON public.financial_transactions;
CREATE TRIGGER trg_prevent_financial_tx_delete
BEFORE DELETE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.prevent_financial_transaction_delete();

-- 5. Reforçar trigger de integridade contábil para bloquear adulteração de lançamentos cancelados ou estornados
CREATE OR REPLACE FUNCTION public.process_financial_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado: apenas a diretoria gerencia finanças' USING ERRCODE = '42501';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'cancelado' THEN
      RAISE EXCEPTION 'Lançamentos cancelados são imutáveis para preservação da auditoria' USING ERRCODE = '23514';
    END IF;

    IF OLD.is_reversal AND (
      NEW.amount <> OLD.amount
      OR NEW.entry_type <> OLD.entry_type
      OR NEW.original_transaction_id IS DISTINCT FROM OLD.original_transaction_id
    ) THEN
      RAISE EXCEPTION 'Não é permitido alterar valor, tipo ou referência de um lançamento de estorno' USING ERRCODE = '23514';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.financial_transactions
      WHERE original_transaction_id = OLD.id
        AND is_reversal = true
        AND status <> 'cancelado'
    ) AND (
      NEW.amount <> OLD.amount
      OR NEW.entry_type <> OLD.entry_type
      OR NEW.status <> OLD.status
    ) THEN
      RAISE EXCEPTION 'Este lançamento já possui estorno ativo e não pode ter valor, tipo ou status alterados' USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Conversão exata para centavos inteiros
  NEW.amount_cents := round(NEW.amount * 100)::bigint;

  -- Sincronizar entry_type com kind e is_donation
  IF NEW.entry_type = 'doacao' THEN
    NEW.kind := 'receita'::public.finance_kind;
    NEW.is_donation := true;
  ELSIF NEW.entry_type = 'receita' THEN
    NEW.kind := 'receita'::public.finance_kind;
    NEW.is_donation := false;
  ELSIF NEW.entry_type = 'despesa' THEN
    NEW.kind := 'despesa'::public.finance_kind;
    NEW.is_donation := false;
  END IF;

  -- Validar status por tipo de lançamento
  IF NEW.status = 'pago' AND NEW.entry_type <> 'despesa' THEN
    RAISE EXCEPTION 'Status "pago" só é válido para despesas' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'recebido' AND NEW.entry_type NOT IN ('receita', 'doacao') THEN
    RAISE EXCEPTION 'Status "recebido" só é válido para receitas e doações' USING ERRCODE = '23514';
  END IF;

  -- Definir settlement_date automaticamente quando liquidado
  IF NEW.status IN ('recebido', 'pago') AND NEW.settlement_date IS NULL THEN
    NEW.settlement_date := NEW.occurred_on;
  END IF;

  -- Exigir justificativa no cancelamento
  IF NEW.status = 'cancelado' AND (NEW.cancellation_reason IS NULL OR char_length(btrim(NEW.cancellation_reason)) < 3) THEN
    RAISE EXCEPTION 'Lançamentos cancelados exigem justificativa de pelo menos 3 caracteres' USING ERRCODE = '23514';
  END IF;

  -- Validar estorno
  IF NEW.is_reversal AND NEW.original_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Lançamentos de estorno exigem referência ao lançamento original' USING ERRCODE = '23514';
  END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.process_financial_transaction() FROM PUBLIC, anon, authenticated;

-- 6. Calcular resumo financeiro no servidor a partir de amount_cents (aritmética inteira exata)
CREATE OR REPLACE FUNCTION public.get_financial_summary(
  _start_date date,
  _end_date date
)
RETURNS TABLE (
  opening_balance numeric(12,2),
  received_revenues numeric(12,2),
  received_donations numeric(12,2),
  paid_expenses numeric(12,2),
  net_cash_flow numeric(12,2),
  calculated_balance numeric(12,2),
  pending_receivables numeric(12,2),
  pending_payables numeric(12,2)
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_opening_rev_cents bigint := 0;
  v_opening_don_cents bigint := 0;
  v_opening_exp_cents bigint := 0;
  v_open_bal_cents bigint := 0;

  v_rec_rev_cents bigint := 0;
  v_rec_don_cents bigint := 0;
  v_paid_exp_cents bigint := 0;
  v_net_cents bigint := 0;
  v_calc_bal_cents bigint := 0;

  v_pend_rec_cents bigint := 0;
  v_pend_pay_cents bigint := 0;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  SELECT
    coalesce(sum(CASE WHEN entry_type = 'receita' THEN amount_cents ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'doacao' THEN amount_cents ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'despesa' THEN amount_cents ELSE 0 END), 0)
  INTO v_opening_rev_cents, v_opening_don_cents, v_opening_exp_cents
  FROM public.financial_transactions
  WHERE coalesce(settlement_date, occurred_on) < _start_date
    AND status IN ('recebido', 'pago');

  v_open_bal_cents := (v_opening_rev_cents + v_opening_don_cents) - v_opening_exp_cents;

  SELECT
    coalesce(sum(CASE WHEN entry_type = 'receita' AND status = 'recebido' THEN amount_cents ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'doacao' AND status = 'recebido' THEN amount_cents ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'despesa' AND status = 'pago' THEN amount_cents ELSE 0 END), 0)
  INTO v_rec_rev_cents, v_rec_don_cents, v_paid_exp_cents
  FROM public.financial_transactions
  WHERE coalesce(settlement_date, occurred_on) BETWEEN _start_date AND _end_date;

  v_net_cents := (v_rec_rev_cents + v_rec_don_cents) - v_paid_exp_cents;
  v_calc_bal_cents := v_open_bal_cents + v_net_cents;

  SELECT
    coalesce(sum(CASE WHEN entry_type IN ('receita', 'doacao') THEN amount_cents ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'despesa' THEN amount_cents ELSE 0 END), 0)
  INTO v_pend_rec_cents, v_pend_pay_cents
  FROM public.financial_transactions
  WHERE occurred_on BETWEEN _start_date AND _end_date
    AND status IN ('pendente', 'previsto');

  RETURN QUERY SELECT
    (v_open_bal_cents::numeric / 100.0)::numeric(12,2),
    (v_rec_rev_cents::numeric / 100.0)::numeric(12,2),
    (v_rec_don_cents::numeric / 100.0)::numeric(12,2),
    (v_paid_exp_cents::numeric / 100.0)::numeric(12,2),
    (v_net_cents::numeric / 100.0)::numeric(12,2),
    (v_calc_bal_cents::numeric / 100.0)::numeric(12,2),
    (v_pend_rec_cents::numeric / 100.0)::numeric(12,2),
    (v_pend_pay_cents::numeric / 100.0)::numeric(12,2);
END; $$;
REVOKE ALL ON FUNCTION public.get_financial_summary(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date, date) TO authenticated;

-- 7. Validar metadados de comprovantes e caminhos seguros em financial_attachments
ALTER TABLE public.financial_attachments
  DROP CONSTRAINT IF EXISTS financial_attachments_safe_path_check,
  DROP CONSTRAINT IF EXISTS financial_attachments_file_name_check;

ALTER TABLE public.financial_attachments
  ADD CONSTRAINT financial_attachments_safe_path_check
    CHECK (
      storage_path !~ '\.\.'
      AND storage_path ~ '^[0-9a-fA-F-]{36}/[0-9a-fA-F0-9_-]+\.(pdf|jpg|jpeg|png|webp)$'
    ),
  ADD CONSTRAINT financial_attachments_file_name_check
    CHECK (char_length(btrim(file_name)) BETWEEN 1 AND 150 AND file_name !~ '[\\/<>\x00-\x1f]');

-- 8. Validar protocolos seguros (bloquear javascript:/data:) nas tabelas de conteúdo e CMS
ALTER TABLE public.site_content
  DROP CONSTRAINT IF EXISTS site_content_valid_slug_check,
  DROP CONSTRAINT IF EXISTS site_content_json_object_check;

ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_valid_slug_check
    CHECK (
      page_slug ~ '^[a-z0-9-]{1,60}$'
      AND section_key ~ '^[a-z0-9_-]{1,60}$'
    ),
  ADD CONSTRAINT site_content_json_object_check
    CHECK (jsonb_typeof(content) = 'object');

ALTER TABLE public.site_projects
  DROP CONSTRAINT IF EXISTS site_projects_safe_image_url_check;
ALTER TABLE public.site_projects
  ADD CONSTRAINT site_projects_safe_image_url_check
    CHECK (image_url IS NULL OR image_url ~* '^https?://|^/');

ALTER TABLE public.gallery_photos
  DROP CONSTRAINT IF EXISTS gallery_photos_safe_image_url_check;
ALTER TABLE public.gallery_photos
  ADD CONSTRAINT gallery_photos_safe_image_url_check
    CHECK (image_url ~* '^https?://|^/');

ALTER TABLE public.news_articles
  DROP CONSTRAINT IF EXISTS news_articles_safe_cover_url_check;
ALTER TABLE public.news_articles
  ADD CONSTRAINT news_articles_safe_cover_url_check
    CHECK (cover_url IS NULL OR cover_url ~* '^https?://|^/');

ALTER TABLE public.sponsors
  DROP CONSTRAINT IF EXISTS sponsors_safe_urls_check;
ALTER TABLE public.sponsors
  ADD CONSTRAINT sponsors_safe_urls_check
    CHECK (
      (logo_url IS NULL OR logo_url ~* '^https?://|^/')
      AND (website IS NULL OR website ~* '^https?://')
    );
