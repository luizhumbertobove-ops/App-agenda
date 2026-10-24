-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores)
-- Vídeos na galeria da vitrine: cada item passa a ter um tipo (foto ou vídeo).
DO $$ BEGIN
  CREATE TYPE "GalleryMediaType" AS ENUM ('IMAGE', 'VIDEO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE "GalleryPhoto" ADD COLUMN IF NOT EXISTS "type" "GalleryMediaType" NOT NULL DEFAULT 'IMAGE';
