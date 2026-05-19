-- ============================================================
-- TaskHub — Migration 003: Storage Buckets
-- Run in Supabase SQL Editor
-- ============================================================

-- Bucket: product-images (original + bg-removed product photos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  TRUE,
  10485760,  -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Bucket: generated-images (AI-generated outputs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'generated-images',
  'generated-images',
  TRUE,
  20971520,  -- 20 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Storage RLS Policies
-- ============================================================

-- product-images: admins can upload; everyone can read (public bucket)
CREATE POLICY "product_images_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

CREATE POLICY "product_images_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'product-images');

CREATE POLICY "product_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND public.is_admin()
  );

-- generated-images: backend service role uploads; users can read their own task's images
CREATE POLICY "generated_images_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'generated-images');

CREATE POLICY "generated_images_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'generated-images'
    AND (
      public.is_admin()
      OR auth.uid()::TEXT = (storage.foldername(name))[1]
    )
  );
