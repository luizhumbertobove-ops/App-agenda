-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores).
-- Só adiciona colunas; nenhum dado existente é alterado.

-- Cobrança criada automaticamente ao concluir um atendimento (o "Reabrir" remove só essas).
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "fromCompletion" BOOLEAN NOT NULL DEFAULT false;

-- Jornada de trabalho por dia da semana (JSON; vazio = padrão do código).
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "workSchedule" JSONB;

-- Textos do modal de detalhes do serviço na vitrine.
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Service" ADD COLUMN IF NOT EXISTS "sessionDetails" TEXT;
