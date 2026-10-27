-- ===== Migration 0005: Financial Management Module Expansion =====

-- 1. Create financial status and type constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'financial_status') THEN
    CREATE TYPE public.financial_status AS ENUM ('previsto', 'pendente', 'recebido', 'pago', 'cancelado');
  END IF;
END $$;

-- 2. Alter financial_transactions table to support complete accounting workflow
ALTER TABLE public.financial_transactions
  ADD COLUMN IF NOT EXISTS entry_type text NOT NULL DEFAULT 'receita' CHECK (entry_type IN ('receita', 'despesa', 'doacao')),
  ADD COLUMN IF NOT EXISTS status public.financial_status NOT NULL DEFAULT 'recebido',
  ADD COLUMN IF NOT EXISTS competency_date date,
  ADD COLUMN IF NOT EXISTS settlement_date date,
  ADD COLUMN IF NOT EXISTS payment_method text CHECK (payment_method IS NULL OR char_length(payment_method) <= 60),
  ADD COLUMN IF NOT EXISTS notes text CHECK (notes IS NULL OR char_length(notes) <= 1000),
  ADD COLUMN IF NOT EXISTS cancellation_reason text CHECK (cancellation_reason IS NULL OR char_length(cancellation_reason) <= 500),
  ADD COLUMN IF NOT EXISTS original_transaction_id uuid REFERENCES public.financial_transactions(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS is_reversal boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS amount_cents bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- 3. Trigger to maintain integrity, precision, and consistency
CREATE OR REPLACE FUNCTION public.process_financial_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Check user permissions (diretoria only)
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado: apenas a diretoria gerencia finanças' USING ERRCODE = '42501';
  END IF;

  -- Ensure exact cent conversion from decimal amount
  NEW.amount_cents := round(NEW.amount * 100)::bigint;

  -- Synchronize entry_type with core schema columns (kind & is_donation)
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

  -- Validate status by entry type
  IF NEW.status = 'pago' AND NEW.entry_type <> 'despesa' THEN
    RAISE EXCEPTION 'Status "pago" só é válido para despesas' USING ERRCODE = '23514';
  END IF;
  IF NEW.status = 'recebido' AND NEW.entry_type NOT IN ('receita', 'doacao') THEN
    RAISE EXCEPTION 'Status "recebido" só é válido para receitas e doações' USING ERRCODE = '23514';
  END IF;

  -- Set settlement_date if settled and not provided
  IF NEW.status IN ('recebido', 'pago') AND NEW.settlement_date IS NULL THEN
    NEW.settlement_date := NEW.occurred_on;
  END IF;

  -- Validate cancellation
  IF NEW.status = 'cancelado' AND (NEW.cancellation_reason IS NULL OR btrim(NEW.cancellation_reason) = '') THEN
    RAISE EXCEPTION 'Lançamentos cancelados exigem justificativa' USING ERRCODE = '23514';
  END IF;

  -- Validate reversal
  IF NEW.is_reversal AND NEW.original_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Lançamentos de estorno exigem referência ao lançamento original' USING ERRCODE = '23514';
  END IF;

  -- Set created_by if null
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_process_financial_transaction ON public.financial_transactions;
CREATE TRIGGER trg_process_financial_transaction
BEFORE INSERT OR UPDATE ON public.financial_transactions
FOR EACH ROW EXECUTE FUNCTION public.process_financial_transaction();

-- 4. Stored procedure to safely cancel a transaction with audit
CREATE OR REPLACE FUNCTION public.cancel_financial_transaction(
  _transaction_id uuid,
  _reason text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  tx public.financial_transactions;
BEGIN
  IF NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  IF _reason IS NULL OR char_length(btrim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Informe uma justificativa de cancelamento com pelo menos 3 caracteres' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO tx FROM public.financial_transactions WHERE id = _transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento não encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF tx.status = 'cancelado' THEN
    RAISE EXCEPTION 'Este lançamento já está cancelado' USING ERRCODE = '23514';
  END IF;

  UPDATE public.financial_transactions
     SET status = 'cancelado'::public.financial_status,
         cancellation_reason = btrim(_reason),
         updated_at = now()
   WHERE id = tx.id;

  PERFORM public.write_audit(
    'cancelar_lancamento_financeiro',
    'financial_transactions',
    tx.id,
    jsonb_build_object(
      'descricao', tx.description,
      'valor', tx.amount,
      'tipo', tx.entry_type,
      'status_anterior', tx.status,
      'justificativa', btrim(_reason)
    )
  );
END; $$;
REVOKE ALL ON FUNCTION public.cancel_financial_transaction(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cancel_financial_transaction(uuid, text) TO authenticated;

-- 5. Stored procedure to create an audited reversal
CREATE OR REPLACE FUNCTION public.reverse_financial_transaction(
  _transaction_id uuid,
  _reason text
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  orig public.financial_transactions;
  new_id uuid;
  reversal_type text;
  reversal_status public.financial_status;
BEGIN
  IF NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  IF _reason IS NULL OR char_length(btrim(_reason)) < 3 THEN
    RAISE EXCEPTION 'Informe uma justificativa de estorno com pelo menos 3 caracteres' USING ERRCODE = '23514';
  END IF;

  SELECT * INTO orig FROM public.financial_transactions WHERE id = _transaction_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Lançamento original não encontrado' USING ERRCODE = 'P0002';
  END IF;

  IF orig.status NOT IN ('recebido', 'pago') THEN
    RAISE EXCEPTION 'Apenas lançamentos efetivamente realizados (recebidos ou pagos) podem ser estornados' USING ERRCODE = '23514';
  END IF;

  IF EXISTS (SELECT 1 FROM public.financial_transactions WHERE original_transaction_id = orig.id AND is_reversal = true AND status <> 'cancelado') THEN
    RAISE EXCEPTION 'Este lançamento já possui um estorno ativo registrado' USING ERRCODE = '23514';
  END IF;

  -- Opposite transaction type to balance books cleanly
  IF orig.entry_type IN ('receita', 'doacao') THEN
    reversal_type := 'despesa';
    reversal_status := 'pago'::public.financial_status;
  ELSE
    reversal_type := 'receita';
    reversal_status := 'recebido'::public.financial_status;
  END IF;

  INSERT INTO public.financial_transactions (
    entry_type,
    category_id,
    description,
    amount,
    occurred_on,
    settlement_date,
    payment_method,
    status,
    notes,
    original_transaction_id,
    is_reversal,
    cancellation_reason,
    created_by
  ) VALUES (
    reversal_type,
    orig.category_id,
    'Estorno: ' || orig.description,
    orig.amount,
    current_date,
    current_date,
    orig.payment_method,
    reversal_status,
    'Estorno referente ao lançamento ' || orig.id::text || '. Motivo: ' || btrim(_reason),
    orig.id,
    true,
    btrim(_reason),
    auth.uid()
  ) RETURNING id INTO new_id;

  PERFORM public.write_audit(
    'estornar_lancamento_financeiro',
    'financial_transactions',
    new_id,
    jsonb_build_object(
      'lancamento_original', orig.id,
      'descricao_original', orig.description,
      'valor', orig.amount,
      'motivo', btrim(_reason)
    )
  );

  RETURN new_id;
END; $$;
REVOKE ALL ON FUNCTION public.reverse_financial_transaction(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reverse_financial_transaction(uuid, text) TO authenticated;

-- 6. Stored procedure to calculate exact period indicators
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
  v_opening_rev numeric(12,2) := 0;
  v_opening_don numeric(12,2) := 0;
  v_opening_exp numeric(12,2) := 0;
  v_open_bal numeric(12,2) := 0;

  v_rec_rev numeric(12,2) := 0;
  v_rec_don numeric(12,2) := 0;
  v_paid_exp numeric(12,2) := 0;
  v_net numeric(12,2) := 0;
  v_calc_bal numeric(12,2) := 0;

  v_pend_rec numeric(12,2) := 0;
  v_pend_pay numeric(12,2) := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;

  -- 1. Initial / opening balance before _start_date (only effectively settled transactions)
  SELECT
    coalesce(sum(CASE WHEN entry_type = 'receita' THEN amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'doacao' THEN amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'despesa' THEN amount ELSE 0 END), 0)
  INTO v_opening_rev, v_opening_don, v_opening_exp
  FROM public.financial_transactions
  WHERE coalesce(settlement_date, occurred_on) < _start_date
    AND status IN ('recebido', 'pago');

  v_open_bal := (v_opening_rev + v_opening_don) - v_opening_exp;

  -- 2. Effectively settled inside period [_start_date, _end_date]
  -- Distinct calculation: revenues (without donations) and donations separately!
  SELECT
    coalesce(sum(CASE WHEN entry_type = 'receita' AND status = 'recebido' THEN amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'doacao' AND status = 'recebido' THEN amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'despesa' AND status = 'pago' THEN amount ELSE 0 END), 0)
  INTO v_rec_rev, v_rec_don, v_paid_exp
  FROM public.financial_transactions
  WHERE coalesce(settlement_date, occurred_on) BETWEEN _start_date AND _end_date;

  v_net := (v_rec_rev + v_rec_don) - v_paid_exp;
  v_calc_bal := v_open_bal + v_net;

  -- 3. Pending inside period (or overall pending if scheduled for period)
  SELECT
    coalesce(sum(CASE WHEN entry_type IN ('receita', 'doacao') THEN amount ELSE 0 END), 0),
    coalesce(sum(CASE WHEN entry_type = 'despesa' THEN amount ELSE 0 END), 0)
  INTO v_pend_rec, v_pend_pay
  FROM public.financial_transactions
  WHERE occurred_on BETWEEN _start_date AND _end_date
    AND status IN ('pendente', 'previsto');

  RETURN QUERY SELECT
    v_open_bal,
    v_rec_rev,
    v_rec_don,
    v_paid_exp,
    v_net,
    v_calc_bal,
    v_pend_rec,
    v_pend_pay;
END; $$;
REVOKE ALL ON FUNCTION public.get_financial_summary(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_financial_summary(date, date) TO authenticated;

-- Seed essential default categories if missing
INSERT INTO public.financial_categories (name, kind) VALUES
  ('Mensalidades', 'receita'),
  ('Eventos e Inscrições', 'receita'),
  ('Patrocínios', 'receita'),
  ('Doações Pessoa Física', 'receita'),
  ('Doações Pessoa Jurídica', 'receita'),
  ('Rifas e Campanhas', 'receita'),
  ('Outras Receitas', 'receita'),
  ('Manutenção da Pista', 'despesa'),
  ('Aluguel e Infraestrutura', 'despesa'),
  ('Material e Equipamentos', 'despesa'),
  ('Contabilidade e Taxas', 'despesa'),
  ('Premiações de Eventos', 'despesa'),
  ('Comunicação e Impressos', 'despesa'),
  ('Outras Despesas', 'despesa')
ON CONFLICT (name, kind) DO NOTHING;