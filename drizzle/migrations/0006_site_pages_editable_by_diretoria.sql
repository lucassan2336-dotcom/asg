-- ===== Migration 0006: Site Pages Editable Only by Diretoria =====

-- 1. Table for structured page content (hero, descriptions, institutional text, contact info)
CREATE TABLE IF NOT EXISTS public.site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug text NOT NULL,
  section_key text NOT NULL DEFAULT 'main',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_site_content_page_section UNIQUE (page_slug, section_key)
);

GRANT SELECT ON public.site_content TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_site_content_updated
BEFORE UPDATE ON public.site_content
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Publico le conteudo do site"
ON public.site_content FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Diretoria gerencia conteudo do site"
ON public.site_content FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'diretoria'))
WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- 2. Table for projects
CREATE TABLE IF NOT EXISTS public.site_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  description text NOT NULL CHECK (char_length(btrim(description)) >= 5),
  category text NOT NULL DEFAULT 'Social' CHECK (char_length(btrim(category)) <= 80),
  target_audience text CHECK (target_audience IS NULL OR char_length(target_audience) <= 120),
  image_url text,
  published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_projects TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.site_projects TO authenticated;
GRANT ALL ON public.site_projects TO service_role;
ALTER TABLE public.site_projects ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_site_projects_updated
BEFORE UPDATE ON public.site_projects
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Publico le projetos publicados"
ON public.site_projects FOR SELECT TO anon, authenticated
USING (published = true OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'diretoria')));

CREATE POLICY "Diretoria gerencia projetos"
ON public.site_projects FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'diretoria'))
WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- 3. Table for competition results
CREATE TABLE IF NOT EXISTS public.competition_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  championship_name text NOT NULL CHECK (char_length(btrim(championship_name)) BETWEEN 2 AND 160),
  category text NOT NULL CHECK (char_length(btrim(category)) BETWEEN 1 AND 80),
  position int NOT NULL CHECK (position >= 1),
  athlete_name text NOT NULL CHECK (char_length(btrim(athlete_name)) BETWEEN 2 AND 120),
  score text CHECK (score IS NULL OR char_length(score) <= 50),
  event_date date,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.competition_results TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.competition_results TO authenticated;
GRANT ALL ON public.competition_results TO service_role;
ALTER TABLE public.competition_results ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_competition_results_updated
BEFORE UPDATE ON public.competition_results
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Publico le resultados publicados"
ON public.competition_results FOR SELECT TO anon, authenticated
USING (published = true OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'diretoria')));

CREATE POLICY "Diretoria gerencia resultados"
ON public.competition_results FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'diretoria'))
WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- 4. Table for gallery photos
CREATE TABLE IF NOT EXISTS public.gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 160),
  image_url text NOT NULL CHECK (char_length(btrim(image_url)) >= 5),
  caption text CHECK (caption IS NULL OR char_length(caption) <= 500),
  event_name text CHECK (event_name IS NULL OR char_length(event_name) <= 120),
  published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.gallery_photos TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.gallery_photos TO authenticated;
GRANT ALL ON public.gallery_photos TO service_role;
ALTER TABLE public.gallery_photos ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER trg_gallery_photos_updated
BEFORE UPDATE ON public.gallery_photos
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE POLICY "Publico le fotos publicadas"
ON public.gallery_photos FOR SELECT TO anon, authenticated
USING (published = true OR (auth.uid() IS NOT NULL AND public.has_role(auth.uid(), 'diretoria')));

CREATE POLICY "Diretoria gerencia fotos"
ON public.gallery_photos FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'diretoria'))
WITH CHECK (public.has_role(auth.uid(), 'diretoria'));

-- 5. Audit triggers
CREATE TRIGGER audit_site_content AFTER INSERT OR UPDATE OR DELETE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_site_projects AFTER INSERT OR UPDATE OR DELETE ON public.site_projects FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_competition_results AFTER INSERT OR UPDATE OR DELETE ON public.competition_results FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_gallery_photos AFTER INSERT OR UPDATE OR DELETE ON public.gallery_photos FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
