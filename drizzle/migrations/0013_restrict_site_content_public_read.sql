DROP POLICY IF EXISTS "Publico le conteudo do site" ON public.site_content;
CREATE POLICY "Publico le conteudo das paginas publicas" ON public.site_content
FOR SELECT TO anon, authenticated
USING (page_slug IN ('home','sobre','projetos','noticias','eventos','resultados','galeria','apoiadores','associe-se','contato','auth','transparencia','ranking'));