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
    orig.occurred_on,
    coalesce(orig.settlement_date, orig.occurred_on),
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