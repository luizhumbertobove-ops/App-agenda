# Fase 2: domínio compartilhado (constantes, formatação, tipos, WhatsApp) — Plano

> **Para quem executa:** skill `delegar`, tarefa a tarefa, com `test-driven-development`. Modelo de formato: plano da fase 1 (`2026-10-24-fase1-integridade-agenda.md`).

**Objetivo:** cada regra repetida passa a existir num lugar só: telefone "sem WhatsApp", fuso de Brasília, formatação de hora/data, status de cobrança em aberto, tipos dos modais e o envio de WhatsApp com registro no histórico.

**Arquitetura:** constantes e funções puras (seguras para componentes de cliente) em `src/lib/domain/constants.ts` e `src/lib/date.ts`; tipos de formulário em `src/lib/types.ts`; envio + histórico em `src/lib/domain/messaging.ts` (servidor). Os chamadores trocam o código repetido pela função; comportamento externo idêntico.

**Stack:** Next 16, Prisma 7, Vitest (banco de teste da fase 1).

**Origem:** auditoria de 24/10/2026, itens 6 e 7.

## Restrições globais

- Comportamento e textos visíveis não mudam (é refatoração), exceto: falha de envio de WhatsApp passa a ir para o log do servidor (`console.error`) em vez de sumir.
- `src/lib/domain/constants.ts` e `src/lib/date.ts` não podem importar Prisma nem nada de servidor (são usados em `"use client"`).
- Testes só no banco de teste; nenhuma chamada real ao WhatsApp (mock de `@/lib/evolution`).

## Foco de revisão

- Telefone vazio, `null` ou `"00000000000"` → sem WhatsApp, em todos os pontos (listas, jobs, cobrança).
- Hora perto da meia-noite (ex.: 02:30 UTC = 23:30 do dia anterior em Brasília) formatada no dia certo — teste na Tarefa 1.
- Envio que falha não grava histórico de "enviada" — teste na Tarefa 3.
- Confirmação enviada marca `confirmationSentAt` (job e envio manual) — teste na Tarefa 3.

---

### Tarefa 1: constantes e formatação únicas

**Arquivos:** modificar `src/lib/domain/constants.ts`, `src/lib/date.ts`; criar `src/lib/date.test.ts`, `src/lib/domain/constants.test.ts`; trocar usos em todo `src/` (fora `generated/`).

**Interfaces (produz):**
- `constants.ts`: `NO_PHONE = "00000000000"`; `hasWhatsapp(phone: string | null | undefined): boolean` (falso para vazio, só espaços e `NO_PHONE`).
- `date.ts`: `TZ_BR = "America/Sao_Paulo"`; `dateKeyBR(date: Date): string` → `"YYYY-MM-DD"` no fuso de Brasília. `formatTimeBR`/`formatDateBR` já existem.

- [ ] Testes que falham: `hasWhatsapp("00000000000") === false`, `hasWhatsapp("") === false`, `hasWhatsapp(null) === false`, `hasWhatsapp("5511988887777") === true`; `dateKeyBR(new Date("2030-03-05T02:30:00Z")) === "2030-03-04"`; `formatTimeBR(new Date("2030-03-05T02:30:00Z")) === "23:30"`.
- [ ] Implementar.
- [ ] Trocar: toda string `"America/Sao_Paulo"` → `TZ_BR` (inclusive nas próprias funções de `date.ts`); comparações com `"00000000000"` → `hasWhatsapp`/`NO_PHONE` (em `edit-client-form.tsx` e no `where` do reengajamento use `NO_PHONE`); `horaBR`/`dataBR` locais em `new-appointment-modal.tsx`, `edit-appointment-modal.tsx`, `week-appointment-card.tsx` → `formatTimeBR(new Date(iso))` / `dateKeyBR(new Date(iso))`; listas `["PENDING", "SENT", "OVERDUE"]` → `OPEN_PAYMENT_STATUSES` (`app/agenda/page.tsx`, `app/page.tsx`, `app/financeiro/page.tsx`, `app/clientes/page.tsx`, `api/clients/route.ts`, `api/clients/[id]/route.ts`).
- [ ] `grep` de verificação: nenhuma ocorrência de `"America/Sao_Paulo"` fora de `date.ts`, nem de `"00000000000"` fora de `constants.ts`, nem de `function horaBR|function dataBR`, nem de `"PENDING", "SENT", "OVERDUE"`.
- [ ] `npm test`, `npm run typecheck`, `npm run lint` limpos. Commit `refactor: constantes e formatação de data num lugar só`.

### Tarefa 2: tipos dos formulários num lugar só

**Arquivos:** criar `src/lib/types.ts`; modificar `client-combobox.tsx`, `edit-appointment-modal.tsx`, `new-appointment-modal.tsx`, `vitrine/agendar-form.tsx`, `hooks/use-client-list.ts` (se declarar o tipo).

**Interfaces (produz):** `ServiceOption = { id: string; name: string; durationMins: number; price: number }`; `SlotOption = { start: string; end: string; available?: boolean }`; `ClientOption = { id: string; name: string; phone: string }`.

- [ ] Substituir as declarações locais `type Service/Slot/Client` desses arquivos pelos tipos acima (renomeando os usos). `service-modal.tsx` e `edit-client-form.tsx` têm formatos diferentes: não mexer.
- [ ] `npm run typecheck`, `npm run lint` limpos. Commit `refactor: tipos dos formulários compartilhados`.

### Tarefa 3: envio de WhatsApp com histórico num lugar só

**Arquivos:** criar `src/lib/domain/messaging.ts`, `src/lib/domain/messaging.test.ts`; modificar `api/appointments/[id]/route.ts` (falta), `api/messages/send-to-client/route.ts`, `api/messages/manual-log/route.ts`, `api/payments/send/route.ts`, `api/payments/[id]/resend/route.ts`, `lib/jobs/confirmations.ts`, `lib/jobs/reengagement.ts`.

**Interfaces (produz):**
```ts
type LoggedMessage = { clientId: string; type: MessageType; message: string; appointmentId?: string };
/** Envia pelo servidor e registra como "sent". Falha: console.error e relança (nada é registrado). */
sendAndLog(phone: string, m: LoggedMessage): Promise<void>
/** Registra envio feito à mão pelo aparelho ("manual"). */
logManualMessage(m: LoggedMessage): Promise<void>
```
Os dois marcam `confirmationSentAt = agora` quando `type === "CONFIRMATION"` e há `appointmentId`.

- [ ] Testes que falham (`vi.mock("@/lib/evolution", ...)` com `sendText` falso): envio ok grava `WhatsappLog` status `"sent"`; envio que lança não grava nada e a promessa rejeita; CONFIRMATION com `appointmentId` marca `confirmationSentAt`; `logManualMessage` grava `"manual"`.
- [ ] Implementar e trocar cada par `sendText` + `whatsappLog.create` (e o `confirmationSentAt` do job de confirmação e do manual-log) pela função. Os avisos da vitrine (`vitrine/agendar`) não têm histórico: não mexer.
- [ ] `npm test`, `npm run typecheck`, `npm run lint` limpos. Commit `refactor(mensagens): envio e histórico de WhatsApp num lugar só`.

### Tarefa 4: verificação

- [ ] `npm test`, typecheck, lint, build; roteiro HTTP contra o banco de teste (falta com WhatsApp desligado não quebra o PATCH; Pix com cliente sem telefone).
