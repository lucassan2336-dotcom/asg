ALTER TABLE public.membership_applications ADD COLUMN email text;
COMMENT ON COLUMN public.membership_applications.review_notes IS 'DEPRECATED: internal observations are stored in membership_review_notes';
CREATE TABLE public.membership_review_notes (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 application_id uuid NOT NULL REFERENCES public.membership_applications(id),
 author_id uuid NOT NULL,
 note text NOT NULL CHECK (char_length(btrim(note)) BETWEEN 1 AND 500),
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.membership_review_notes TO authenticated;
GRANT ALL ON public.membership_review_notes TO service_role;
ALTER TABLE public.membership_review_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Diretoria le observacoes internas" ON public.membership_review_notes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'diretoria'));
CREATE OR REPLACE FUNCTION public.validate_membership_submission() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE account_email text;
BEGIN
 PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 0));
 SELECT email INTO account_email FROM auth.users WHERE id = NEW.user_id AND email_confirmed_at IS NOT NULL;
 IF account_email IS NULL THEN RAISE EXCEPTION 'Confirme o e-mail da sua conta antes de solicitar associação' USING ERRCODE='23514'; END IF;
 NEW.email := lower(account_email);
 NEW.full_name := btrim(NEW.full_name);
 NEW.phone := nullif(btrim(NEW.phone), '');
 NEW.motivation := nullif(btrim(NEW.motivation), '');
 IF NEW.phone IS NOT NULL AND (NEW.phone !~ '^[0-9+() .-]{8,20}$' OR length(regexp_replace(NEW.phone, '[^0-9]', '', 'g')) < 8) THEN RAISE EXCEPTION 'Telefone inválido' USING ERRCODE='23514'; END IF;
 IF NEW.birth_date > current_date OR NEW.birth_date < current_date - interval '120 years' THEN RAISE EXCEPTION 'Data de nascimento inválida' USING ERRCODE='23514'; END IF;
 IF EXISTS (SELECT 1 FROM public.membership_applications WHERE user_id = NEW.user_id OR lower(email) = NEW.email) OR EXISTS (SELECT 1 FROM public.association_memberships WHERE user_id = NEW.user_id) THEN RAISE EXCEPTION 'Já existe uma solicitação. Consulte sua situação ou peça reanálise à diretoria' USING ERRCODE='23505'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.validate_membership_submission() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER validate_membership_submission BEFORE INSERT ON public.membership_applications FOR EACH ROW EXECUTE FUNCTION public.validate_membership_submission();
CREATE TRIGGER audit_application_created AFTER INSERT ON public.membership_applications FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE OR REPLACE FUNCTION public.review_application(_application_id uuid, _approve boolean, _notes text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE app public.membership_applications;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'diretoria') THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 IF _approve IS NULL OR char_length(coalesce(_notes, '')) > 500 THEN RAISE EXCEPTION 'Decisão ou observação inválida' USING ERRCODE='23514'; END IF;
 SELECT * INTO app FROM public.membership_applications WHERE id = _application_id FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
 IF app.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já analisada'; END IF;
 UPDATE public.membership_applications SET status = CASE WHEN _approve THEN 'aprovada'::public.application_status ELSE 'rejeitada'::public.application_status END, reviewed_by = auth.uid(), reviewed_at = now(), review_notes = NULL WHERE id = app.id;
 IF nullif(btrim(_notes), '') IS NOT NULL THEN INSERT INTO public.membership_review_notes(application_id, author_id, note) VALUES(app.id, auth.uid(), btrim(_notes)); END IF;
 IF _approve THEN
  INSERT INTO public.association_memberships(user_id, application_id, status) VALUES(app.user_id, app.id, 'ativa') ON CONFLICT(user_id) DO UPDATE SET status='ativa', application_id=EXCLUDED.application_id;
  INSERT INTO public.user_roles(user_id, role) VALUES(app.user_id, 'associado') ON CONFLICT DO NOTHING;
 END IF;
 PERFORM public.write_audit(CASE WHEN _approve THEN 'aprovar_solicitacao' ELSE 'rejeitar_solicitacao' END, 'membership_applications', app.id, jsonb_build_object('usuario', app.user_id, 'status_anterior', app.status, 'status', CASE WHEN _approve THEN 'aprovada' ELSE 'rejeitada' END));
END; $$;
REVOKE ALL ON FUNCTION public.review_application(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_application(uuid, boolean, text) TO authenticated;
CREATE OR REPLACE FUNCTION public.reopen_application(_application_id uuid, _reason text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE app public.membership_applications;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'diretoria') THEN RAISE EXCEPTION 'Acesso negado' USING ERRCODE='42501'; END IF;
 IF _reason IS NULL OR char_length(btrim(_reason)) NOT BETWEEN 3 AND 500 THEN RAISE EXCEPTION 'Informe uma justificativa de 3 a 500 caracteres'; END IF;
 SELECT * INTO app FROM public.membership_applications WHERE id=_application_id FOR UPDATE;
 IF NOT FOUND OR app.status <> 'rejeitada' THEN RAISE EXCEPTION 'Somente solicitações rejeitadas podem ser reabertas'; END IF;
 UPDATE public.membership_applications SET status='pendente', reviewed_by=NULL, reviewed_at=NULL WHERE id=app.id;
 INSERT INTO public.membership_review_notes(application_id, author_id, note) VALUES(app.id, auth.uid(), btrim(_reason));
 PERFORM public.write_audit('reabrir_solicitacao', 'membership_applications', app.id, jsonb_build_object('status_anterior', app.status, 'decisao_anterior_por', app.reviewed_by, 'decisao_anterior_em', app.reviewed_at, 'justificativa', btrim(_reason)));
END; $$;
REVOKE ALL ON FUNCTION public.reopen_application(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reopen_application(uuid, text) TO authenticated;