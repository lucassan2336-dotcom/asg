REVOKE EXECUTE ON FUNCTION public.audit_row_change() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, uuid, jsonb) FROM anon, authenticated;
-- has_role segue executável: as regras de acesso das tabelas dependem dele.
-- review_application segue executável para usuários logados: o painel da diretoria o chama, e a função valida o papel de diretoria internamente.