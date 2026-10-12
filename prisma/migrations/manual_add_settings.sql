-- Rode este SQL no Supabase SQL Editor (mesmo fluxo das alterações anteriores)
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "confirmationTemplate" TEXT,
    "paymentTemplate" TEXT,
    "reengagementTemplate" TEXT,
    "confirmationDaysBefore" INTEGER NOT NULL DEFAULT 1,
    "reengagementInactivityDays" INTEGER NOT NULL DEFAULT 15,
    "reengagementCooldownDays" INTEGER NOT NULL DEFAULT 15,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);
