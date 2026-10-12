-- Fase 2 do roadmap: tags/aniversário no cliente, bloqueio de horários,
-- configurações extras (meta, hora de envio, template no-show),
-- tipo NO_SHOW no enum de mensagens, notas por sessão e recorrência.

-- [09] Tags e aniversário no cliente
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "birthday" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "tags" TEXT[] NOT NULL DEFAULT '{}';

-- [07] Tabela de horários bloqueados
CREATE TABLE IF NOT EXISTS "BlockedSlot" (
  "id"        TEXT NOT NULL,
  "startTime" TIMESTAMP(3) NOT NULL,
  "endTime"   TIMESTAMP(3) NOT NULL,
  "reason"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT NOW(),
  CONSTRAINT "BlockedSlot_pkey" PRIMARY KEY ("id")
);

-- [08] Meta mensal e hora de envio nas Settings
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "monthlyGoal"          DOUBLE PRECISION;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "confirmationSendHour" INTEGER NOT NULL DEFAULT 9;
ALTER TABLE "Settings" ADD COLUMN IF NOT EXISTS "noShowTemplate"       TEXT;

-- [11] Tipo NO_SHOW no enum
ALTER TYPE "MessageType" ADD VALUE IF NOT EXISTS 'NO_SHOW';

-- [12] Campos de recorrência e notas de sessão no atendimento
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "recurrenceId"  TEXT;
ALTER TABLE "Appointment" ADD COLUMN IF NOT EXISTS "sessionNotes"  TEXT;
