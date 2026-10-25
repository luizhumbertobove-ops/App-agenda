-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores).
-- Só cria uma tabela nova.
CREATE TABLE IF NOT EXISTS "PlanSubscriptionMember" (
  "id"             TEXT PRIMARY KEY,
  "subscriptionId" TEXT NOT NULL REFERENCES "PlanSubscription"("id") ON DELETE CASCADE,
  "clientId"       TEXT NOT NULL REFERENCES "Client"("id") ON DELETE CASCADE,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PlanSubscriptionMember_subscriptionId_clientId_key" ON "PlanSubscriptionMember"("subscriptionId", "clientId");
CREATE INDEX IF NOT EXISTS "PlanSubscriptionMember_clientId_idx" ON "PlanSubscriptionMember"("clientId");