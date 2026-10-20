-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores).
-- Liga/desliga de cada mensagem automática (todas começam ligadas, como antes).
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "confirmationEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "paymentEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "reengagementEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "noShowEnabled" BOOLEAN NOT NULL DEFAULT true;
