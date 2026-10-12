-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores)
ALTER TABLE "Payment" ADD COLUMN "mpPaymentId" TEXT;
CREATE UNIQUE INDEX "Payment_mpPaymentId_key" ON "Payment"("mpPaymentId");
