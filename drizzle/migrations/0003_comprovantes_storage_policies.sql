-- Bucket privado "comprovantes": somente a diretoria lê, envia, atualiza e remove arquivos.
-- Os arquivos seguem o padrão <transaction_id>/<nome-do-arquivo>, alinhado a financial_attachments.

CREATE POLICY "Diretoria lê comprovantes"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'));

CREATE POLICY "Diretoria envia comprovantes"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'));

CREATE POLICY "Diretoria atualiza comprovantes"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'))
WITH CHECK (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'));

CREATE POLICY "Diretoria remove comprovantes"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'comprovantes' AND public.has_role(auth.uid(), 'diretoria'));