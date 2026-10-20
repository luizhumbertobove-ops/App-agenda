-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores).
-- Cobrança cancelada (atendimento cancelado, ou concluído pelo pacote/sem cobrança):
-- sai dos totais e das listas, mas fica no histórico.
ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';

-- Como a cobrança estava antes do "Concluir" (o "Reabrir" restaura).
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "preCompletionStatus" TEXT;
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "preCompletionAmount" DOUBLE PRECISION;
