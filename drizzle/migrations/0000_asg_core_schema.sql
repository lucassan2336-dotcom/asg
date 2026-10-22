
-- ===== Enums =====
CREATE TYPE public.app_role AS ENUM ('diretoria', 'associado');
CREATE TYPE public.application_status AS ENUM ('pendente', 'aprovada', 'rejeitada');
CREATE TYPE public.membership_status AS ENUM ('ativa', 'suspensa', 'encerrada');
CREATE TYPE public.announcement_audience AS ENUM ('publico', 'associados');
CREATE TYPE public.registration_status AS ENUM ('inscrito', 'cancelado', 'presente');
CREATE TYPE public.finance_kind AS ENUM ('receita', 'despesa');

-- ===== Helpers =====
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ===== Profiles =====
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '' CHECK (char_length(full_name) <= 100),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 20),
  birth_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ===== Roles =====
CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Ver os próprios papéis" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));
-- Sem políticas de INSERT/UPDATE/DELETE: papéis só mudam por funções seguras ou pelo responsável do projeto.

CREATE POLICY "Ver o próprio perfil" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));
CREATE POLICY "Criar o próprio perfil" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "Editar o próprio perfil" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, left(coalesce(NEW.raw_user_meta_data->>'full_name', ''), 100))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ===== Audit log =====
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Diretoria lê auditoria" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria'));
-- Sem INSERT/UPDATE/DELETE para clientes: só gravado por funções SECURITY DEFINER.

CREATE OR REPLACE FUNCTION public.write_audit(_action text, _table text, _record uuid, _details jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, details)
  VALUES (auth.uid(), _action, _table, _record, coalesce(_details, '{}'::jsonb));
$$;
REVOKE EXECUTE ON FUNCTION public.write_audit(text, text, uuid, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE rec_id uuid;
BEGIN
  rec_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END;
  PERFORM public.write_audit(lower(TG_OP), TG_TABLE_NAME, rec_id, '{}'::jsonb);
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END; $$;

-- ===== Membership applications =====
CREATE TABLE public.membership_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  full_name text NOT NULL CHECK (char_length(trim(full_name)) BETWEEN 3 AND 100),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 20),
  birth_date date NOT NULL,
  motivation text CHECK (motivation IS NULL OR char_length(motivation) <= 500),
  status public.application_status NOT NULL DEFAULT 'pendente',
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text CHECK (review_notes IS NULL OR char_length(review_notes) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX one_pending_application_per_user ON public.membership_applications(user_id) WHERE status = 'pendente';
GRANT SELECT, INSERT ON public.membership_applications TO authenticated;
GRANT ALL ON public.membership_applications TO service_role;
ALTER TABLE public.membership_applications ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_app_updated BEFORE UPDATE ON public.membership_applications FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Ver a própria solicitação" ON public.membership_applications FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));
CREATE POLICY "Enviar solicitação pendente" ON public.membership_applications FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'pendente' AND reviewed_by IS NULL AND reviewed_at IS NULL AND review_notes IS NULL);
-- Sem UPDATE/DELETE para clientes: análise só pela função review_application.

-- ===== Memberships =====
CREATE TABLE public.association_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  application_id uuid REFERENCES public.membership_applications(id) ON DELETE SET NULL,
  status public.membership_status NOT NULL DEFAULT 'ativa',
  member_since date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.association_memberships TO authenticated;
GRANT ALL ON public.association_memberships TO service_role;
ALTER TABLE public.association_memberships ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_mem_updated BEFORE UPDATE ON public.association_memberships FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Ver a própria associação" ON public.association_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));

CREATE OR REPLACE FUNCTION public.review_application(_application_id uuid, _approve boolean, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE app public.membership_applications;
BEGIN
  IF NOT public.has_role(auth.uid(), 'diretoria') THEN
    RAISE EXCEPTION 'Acesso negado' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO app FROM public.membership_applications WHERE id = _application_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF app.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já analisada'; END IF;

  UPDATE public.membership_applications
     SET status = CASE WHEN _approve THEN 'aprovada'::application_status ELSE 'rejeitada'::application_status END,
         reviewed_by = auth.uid(), reviewed_at = now(), review_notes = left(_notes, 500)
   WHERE id = _application_id;

  IF _approve THEN
    INSERT INTO public.association_memberships (user_id, application_id, status)
    VALUES (app.user_id, app.id, 'ativa')
    ON CONFLICT (user_id) DO UPDATE SET status = 'ativa', application_id = EXCLUDED.application_id;
    INSERT INTO public.user_roles (user_id, role) VALUES (app.user_id, 'associado') ON CONFLICT DO NOTHING;
  END IF;

  PERFORM public.write_audit(CASE WHEN _approve THEN 'aprovar_solicitacao' ELSE 'rejeitar_solicitacao' END,
    'membership_applications', app.id, jsonb_build_object('usuario', app.user_id));
END; $$;
REVOKE EXECUTE ON FUNCTION public.review_application(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_application(uuid, boolean, text) TO authenticated;

-- ===== Content: announcements =====
CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  body text NOT NULL DEFAULT '',
  audience public.announcement_audience NOT NULL DEFAULT 'associados',
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_ann_updated BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Público lê avisos públicos publicados" ON public.announcements FOR SELECT TO anon, authenticated
  USING (published AND audience = 'publico');
CREATE POLICY "Associados leem avisos internos" ON public.announcements FOR SELECT TO authenticated
  USING (published AND audience = 'associados' AND public.has_role(auth.uid(), 'associado'));
CREATE POLICY "Diretoria gerencia avisos" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria')) WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- ===== Events =====
CREATE TABLE public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  description text NOT NULL DEFAULT '',
  location text,
  starts_at timestamptz,
  registration_open boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Público lê eventos publicados" ON public.events FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY "Diretoria gerencia eventos" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria')) WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

CREATE TABLE public.event_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  status public.registration_status NOT NULL DEFAULT 'inscrito',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.event_registrations TO authenticated;
GRANT ALL ON public.event_registrations TO service_role;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_reg_updated BEFORE UPDATE ON public.event_registrations FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Ver as próprias inscrições" ON public.event_registrations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));
CREATE POLICY "Associado se inscreve em evento aberto" ON public.event_registrations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND status = 'inscrito' AND public.has_role(auth.uid(), 'associado')
    AND EXISTS (SELECT 1 FROM public.events e WHERE e.id = event_id AND e.published AND e.registration_open));
CREATE POLICY "Cancelar a própria inscrição" ON public.event_registrations FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'diretoria'));

-- ===== News =====
CREATE TABLE public.news_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 160),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,120}$'),
  summary text,
  body text NOT NULL DEFAULT '',
  cover_url text,
  published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.news_articles TO authenticated;
GRANT ALL ON public.news_articles TO service_role;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_news_updated BEFORE UPDATE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Público lê notícias publicadas" ON public.news_articles FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY "Diretoria gerencia notícias" ON public.news_articles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria')) WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- ===== Sponsors =====
CREATE TABLE public.sponsors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  logo_url text,
  website text,
  sort_order int NOT NULL DEFAULT 0,
  published boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.sponsors TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sponsors TO authenticated;
GRANT ALL ON public.sponsors TO service_role;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sponsors_updated BEFORE UPDATE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Público lê apoiadores publicados" ON public.sponsors FOR SELECT TO anon, authenticated USING (published);
CREATE POLICY "Diretoria gerencia apoiadores" ON public.sponsors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria')) WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- ===== Finance (diretoria only) =====
CREATE TABLE public.financial_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  kind public.finance_kind NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, kind)
);
CREATE TABLE public.financial_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind public.finance_kind NOT NULL,
  category_id uuid REFERENCES public.financial_categories(id) ON DELETE RESTRICT,
  description text NOT NULL CHECK (char_length(description) BETWEEN 1 AND 300),
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  occurred_on date NOT NULL,
  is_donation boolean NOT NULL DEFAULT false,
  donor_name text CHECK (donor_name IS NULL OR char_length(donor_name) <= 120),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.financial_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.financial_transactions(id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  file_name text NOT NULL,
  uploaded_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_categories, public.financial_transactions, public.financial_attachments TO authenticated;
GRANT ALL ON public.financial_categories, public.financial_transactions, public.financial_attachments TO service_role;
ALTER TABLE public.financial_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_attachments ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_fcat_updated BEFORE UPDATE ON public.financial_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ftx_updated BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE POLICY "Diretoria gerencia categorias" ON public.financial_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria')) WITH CHECK (public.has_role(auth.uid(), 'diretoria'));
CREATE POLICY "Diretoria gerencia lançamentos" ON public.financial_transactions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria')) WITH CHECK (public.has_role(auth.uid(), 'diretoria'));
CREATE POLICY "Diretoria gerencia comprovantes" ON public.financial_attachments FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'diretoria')) WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- ===== Audit triggers =====
CREATE TRIGGER audit_fcat AFTER INSERT OR UPDATE OR DELETE ON public.financial_categories FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_ftx AFTER INSERT OR UPDATE OR DELETE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_fatt AFTER INSERT OR UPDATE OR DELETE ON public.financial_attachments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_ann AFTER INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_events AFTER INSERT OR UPDATE OR DELETE ON public.events FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_news AFTER INSERT OR UPDATE OR DELETE ON public.news_articles FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_sponsors AFTER INSERT OR UPDATE OR DELETE ON public.sponsors FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_memberships AFTER UPDATE OR DELETE ON public.association_memberships FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
