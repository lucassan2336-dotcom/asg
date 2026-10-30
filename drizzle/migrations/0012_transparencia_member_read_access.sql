-- 0012_transparencia_member_read_access.sql
-- Permite que membros autenticados (Skatistas Locais e Associados da A.S.G.)
-- visualizem as transações, anexos/comprovantes e categorias no Portal de Transparência.
-- Apenas a diretoria mantém permissões de inserção, alteração e exclusão.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_transactions' AND policyname = 'Membros autenticados leem transacoes'
  ) THEN
    CREATE POLICY "Membros autenticados leem transacoes"
    ON public.financial_transactions FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_attachments' AND policyname = 'Membros autenticados leem anexos'
  ) THEN
    CREATE POLICY "Membros autenticados leem anexos"
    ON public.financial_attachments FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'financial_categories' AND policyname = 'Membros autenticados leem categorias'
  ) THEN
    CREATE POLICY "Membros autenticados leem categorias"
    ON public.financial_categories FOR SELECT TO authenticated
    USING (auth.uid() IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'Membros autenticados leem comprovantes'
  ) THEN
    CREATE POLICY "Membros autenticados leem comprovantes"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'comprovantes' AND auth.uid() IS NOT NULL);
  END IF;
END $$;
