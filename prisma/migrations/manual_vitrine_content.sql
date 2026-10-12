-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores)
-- Conteúdo editável da vitrine (textos, contato e URLs das imagens).
CREATE TABLE IF NOT EXISTS "VitrineContent" (
  "key"       TEXT PRIMARY KEY,
  "value"     TEXT NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
