-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores).
-- Só adiciona colunas; nenhum dado existente é alterado.

-- Pagamento de um pacote de sessões (vendido na ficha do cliente).
ALTER TABLE "Payment" ADD COLUMN IF NOT EXISTS "planSubscriptionId" TEXT;

-- Pacote usado ao concluir o atendimento (o "Reabrir" devolve a sessão a ele).
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "planSubscriptionId" TEXT;

-- Atendimento em parceria com outra massoterapeuta (cliente dela, sem cadastro aqui).
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "isPartner" BOOLEAN NOT NULL DEFAULT false;
