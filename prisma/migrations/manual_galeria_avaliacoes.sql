-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores)
-- Carrossel da galeria e avaliações do Google (com aprovação) na vitrine.
CREATE TABLE IF NOT EXISTS "GalleryPhoto" (
  "id"        TEXT PRIMARY KEY,
  "url"       TEXT NOT NULL,
  "alt"       TEXT NOT NULL DEFAULT '',
  "position"  INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DO $$ BEGIN
  CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'HIDDEN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReviewSource" AS ENUM ('GOOGLE', 'MANUAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "GoogleReview" (
  "id"          TEXT PRIMARY KEY,
  "externalId"  TEXT,
  "author"      TEXT NOT NULL,
  "rating"      INTEGER NOT NULL,
  "text"        TEXT NOT NULL DEFAULT '',
  "publishedAt" TIMESTAMP(3),
  "status"      "ReviewStatus" NOT NULL DEFAULT 'PENDING',
  "source"      "ReviewSource" NOT NULL DEFAULT 'GOOGLE',
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "GoogleReview_externalId_key" ON "GoogleReview"("externalId");
