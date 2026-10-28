-- Migration 0011: Bucket de Armazenamento para Fotos da Galeria / Álbuns
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'gallery',
      'gallery',
      true,
      10485760, -- 10MB
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE
      SET public = true,
          file_size_limit = 10485760,
          allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'objects'
  ) THEN
    DROP POLICY IF EXISTS "Publico visualiza fotos da galeria" ON storage.objects;
    CREATE POLICY "Publico visualiza fotos da galeria"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'gallery');

    DROP POLICY IF EXISTS "Diretoria envia fotos da galeria" ON storage.objects;
    CREATE POLICY "Diretoria envia fotos da galeria"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'gallery'
        AND public.has_role(auth.uid(), 'diretoria')
        AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
      );

    DROP POLICY IF EXISTS "Diretoria atualiza fotos da galeria" ON storage.objects;
    CREATE POLICY "Diretoria atualiza fotos da galeria"
      ON storage.objects FOR UPDATE
      TO authenticated
      USING (
        bucket_id = 'gallery'
        AND public.has_role(auth.uid(), 'diretoria')
      )
      WITH CHECK (
        bucket_id = 'gallery'
        AND public.has_role(auth.uid(), 'diretoria')
      );

    DROP POLICY IF EXISTS "Diretoria exclui fotos da galeria" ON storage.objects;
    CREATE POLICY "Diretoria exclui fotos da galeria"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'gallery'
        AND public.has_role(auth.uid(), 'diretoria')
      );
  END IF;
END $$;

ALTER TABLE public.gallery_photos
  DROP CONSTRAINT IF EXISTS gallery_photos_safe_image_url_check;
ALTER TABLE public.gallery_photos
  ADD CONSTRAINT gallery_photos_safe_image_url_check
    CHECK (image_url ~* '^https?://|^/|^data:image/(jpeg|png|webp|gif);base64,');
