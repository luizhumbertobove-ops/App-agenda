-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores)
-- Permite que um Payment sobreviva à exclusão do cliente (fica "órfão",
-- preservando o histórico financeiro em vez de ser apagado).
ALTER TABLE "Payment" ALTER COLUMN "clientId" DROP NOT NULL;
