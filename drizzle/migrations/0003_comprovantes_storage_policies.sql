-- Bucket privado "comprovantes": somente a diretoria lê, envia, atualiza e remove arquivos.
-- Os arquivos seguem o padrão <transaction_id>/<nome-do-arquivo>, alinhado a financial_attachments.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'comprovantes',
      'comprovantes',
      false,
      5242880,
      ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE
      SET public = false,
          file_size_limit = 5242880,
          allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  END IF;
END $$;

DROP POLICY IF EXISTS "Diretoria lê comprovantes" ON storage.objects;
CREATE POLICY "Diretoria lê comprovantes"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'));

DROP POLICY IF EXISTS "Diretoria envia comprovantes" ON storage.objects;
CREATE POLICY "Diretoria envia comprovantes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'));

DROP POLICY IF EXISTS "Diretoria atualiza comprovantes" ON storage.objects;
CREATE POLICY "Diretoria atualiza comprovantes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'))
WITH CHECK (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'));

DROP POLICY IF EXISTS "Diretoria remove comprovantes" ON storage.objects;
CREATE POLICY "Diretoria remove comprovantes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'));
