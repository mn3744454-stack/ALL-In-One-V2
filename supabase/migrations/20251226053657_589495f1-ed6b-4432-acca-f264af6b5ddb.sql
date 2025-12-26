-- Create storage bucket for horse media (images and videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'horse-media', 
  'horse-media', 
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']
);

-- Allow authenticated users to upload to horse-media bucket
CREATE POLICY "Authenticated users can upload horse media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'horse-media');

-- Allow public read access to horse media
CREATE POLICY "Public can view horse media"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'horse-media');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update horse media"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'horse-media');

-- Allow authenticated users to delete horse media
CREATE POLICY "Authenticated users can delete horse media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'horse-media');

-- Add videos array column to horses table
ALTER TABLE public.horses ADD COLUMN IF NOT EXISTS videos text[] DEFAULT '{}'::text[];