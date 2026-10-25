# Pacote familiar — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** permitir que um pacote de sessões tenha membros (outros clientes cadastrados) que gastam o mesmo saldo único.

**Architecture:** nova tabela `PlanSubscriptionMember` liga o pacote aos membros; o titular continua em `PlanSubscription.clientId`. A regra "pacotes do cliente = titular OU membro" fica num módulo puro `src/lib/plan-access.ts`, usado por todas as consultas. O histórico de uso sai de `Appointment.planSubscriptionId` (já existe).

**Tech Stack:** Next.js (versão do repo — ler `node_modules/next/dist/docs/` antes de mexer em rotas), Prisma 7 com SQL manual no Supabase, zod, Tailwind, Node 22 (`node --test --experimental-strip-types`).

**Spec:** `docs/superpowers/specs/2026-10-24-pacote-familiar-design.md`

## Global Constraints
- Saldo único compartilhado; sem cota por pessoa.
- Membros são sempre clientes já cadastrados: o seletor usa `ClientCombobox` **sem** `allowCreate`.
- O titular não entra na tabela de membros; um pagamento só, no titular.
- Migração manual no padrão de `prisma/migrations/manual_planos_parceria.sql` (comentário "Rode este SQL no Supabase SQL Editor", `IF NOT EXISTS`); depois `npx prisma generate`.
- Telas e textos seguem a skill `design-system` (cores violeta já usadas na seção Pacotes).
- Ao concluir, usa o pacote mais antigo com saldo entre todos os do cliente (titular ou membro).
- Excluir titular com pacote ainda com saldo e com membros: o membro mais antigo (`createdAt` da linha de membro) vira titular e sai da lista de membros. Sem membros, apaga como hoje.

## Review Focus
1. Dois membros concluem ao mesmo tempo com 1 sessão sobrando: só um pode usar a sessão; o outro recebe 409 "sem sessões sobrando". (Task 3, incremento condicional.)
2. Adicionar como membro o próprio titular, ou alguém que já é membro: 400/409 com mensagem clara, sem duplicar. (Task 1 `normalizeMemberIds` + Task 2.)
3. Excluir titular de pacote familiar já esgotado: apaga normalmente, sem transferir. (Task 1 `pickSuccessor`.)
4. Reabrir um atendimento de membro devolve a sessão ao mesmo pacote e reativa o pacote esgotado. (Task 3, verificação manual.)
5. Membro vê o pacote na lista de clientes e o saldo na agenda, não só na ficha. (Task 3.)

---

### Task 1: Banco + regras puras

**Files:**
- Create: `prisma/migrations/manual_pacote_familiar.sql`
- Modify: `prisma/schema.prisma` (models `Client`, `PlanSubscription`; novo `PlanSubscriptionMember`)
- Create: `src/lib/plan-access.ts`
- Test: `src/lib/plan-access.test.ts`
- Modify: `package.json` (script `"test": "node --test --experimental-strip-types src/**/*.test.ts"`)

**Interfaces:**
- Produces:
  - Prisma: `PlanSubscriptionMember { id String @id @default(cuid()); subscriptionId String; clientId String; createdAt DateTime @default(now()) }`, `@@unique([subscriptionId, clientId])`, `@@index([clientId])`, relações `onDelete: Cascade`; `PlanSubscription.members PlanSubscriptionMember[]`; `Client.planMemberships PlanSubscriptionMember[]`.
  - `clientPlansWhere(clientId: string): { OR: [{ clientId: string }, { members: { some: { clientId: string } } }] }`
  - `pickPlanWithBalance<T extends { sessionsUsed: number; purchasedAt: Date; plan: { sessions: number } }>(subs: T[]): T | null` — mais antigo por `purchasedAt` com `sessionsUsed < plan.sessions`.
  - `normalizeMemberIds(ownerId: string, ids: string[]): { ok: true; ids: string[] } | { ok: false; error: string }` — erro `"O titular já faz parte do pacote."` se contém `ownerId`; remove repetidos.
  - `pickSuccessor(sub: { sessionsUsed: number; plan: { sessions: number }; members: { clientId: string; createdAt: Date }[] }): string | null` — `clientId` do membro mais antigo se ainda há saldo, senão `null`.
- `plan-access.ts` não importa nada com alias `@/` (roda direto no Node); só `import type` se precisar.

- [ ] **Step 1: Testes que falham** em `src/lib/plan-access.test.ts` (`node:test` + `node:assert/strict`):
  - `clientPlansWhere("c1")` deep-equals `{ OR: [{ clientId: "c1" }, { members: { some: { clientId: "c1" } } }] }`.
  - `pickPlanWithBalance`: com [A(2024-01, 4/4), B(2024-03, 1/4), C(2024-02, 0/4)] retorna C; com todos esgotados retorna `null`; lista vazia → `null`.
  - `normalizeMemberIds("o", ["a","a","b"])` → `{ ok: true, ids: ["a","b"] }`; `normalizeMemberIds("o", ["a","o"])` → `ok: false`.
  - `pickSuccessor`: saldo 2/4 com membros [x(2024-05), y(2024-04)] → `"y"`; saldo 4/4 → `null`; sem membros → `null`.
- [ ] **Step 2:** `npm test` → FAIL (módulo não existe).
- [ ] **Step 3:** implementar `src/lib/plan-access.ts`, schema e SQL (`CREATE TABLE IF NOT EXISTS "PlanSubscriptionMember"` com FKs `ON DELETE CASCADE`, índice único e índice em `clientId`).
- [ ] **Step 4:** `npm test` → PASS; `npx prisma generate && npm run typecheck` → sem erros.
- [ ] **Step 5:** commit `feat(pacotes): tabela de membros e regras do pacote familiar`. **Avisar o usuário para rodar o SQL no Supabase antes do deploy.**

### Task 2: API de venda e de membros

**Files:**
- Modify: `src/app/api/clients/[id]/plans/route.ts`
- Create: `src/app/api/plans/[subscriptionId]/members/route.ts`

**Interfaces:**
- Consumes: `normalizeMemberIds` (Task 1).
- Produces:
  - `POST /api/clients/[id]/plans` aceita `memberIds?: string[]` (zod `z.array(z.string()).max(10).default([])`). Valida com `normalizeMemberIds` (400 com a mensagem) e confere que todos existem (`client.count`; diferente → 400 `"Cliente não encontrado."`). Cria os membros na mesma transação. Nome do plano: `Pacote familiar de N sessões` quando há membros.
  - `POST /api/plans/[subscriptionId]/members` body `{ clientId: string }` → 201; 404 se pacote/cliente não existe; 400 se é o titular; 409 `"Já faz parte do pacote."` se duplicado (capturar `P2002`).
  - `DELETE /api/plans/[subscriptionId]/members` body `{ clientId: string }` → 204; não mexe em `sessionsUsed`.

- [ ] **Step 1:** implementar as duas rotas (ler o guia de route handlers em `node_modules/next/dist/docs/` — `params` é `Promise`).
- [ ] **Step 2:** `npm run typecheck && npm run lint` → sem erros.
- [ ] **Step 3:** commit `feat(pacotes): venda com membros e rota de membros`.

### Task 3: Consultas que enxergam o membro

**Files:**
- Modify: `src/app/api/appointments/[id]/route.ts:98-145`
- Modify: `src/app/agenda/page.tsx:~112` e `src/app/clientes/page.tsx:~61`, `src/app/api/clients/route.ts:~19`

**Interfaces:**
- Consumes: `clientPlansWhere`, `pickPlanWithBalance` (Task 1).

- [ ] **Step 1:** em Concluir, buscar `prisma.planSubscription.findMany({ where: { ...clientPlansWhere(existing.clientId), active: true }, include: { plan: true } })` e escolher com `pickPlanWithBalance`.
- [ ] **Step 2:** trocar o `update` do uso da sessão por incremento condicional: `updateMany({ where: { id, sessionsUsed: planSub.sessionsUsed }, data: { sessionsUsed: used, active: used < sessions } })`; se `count === 0`, desfazer o lock de status (voltar para `existing.status`) e responder 409 `"Este cliente não tem sessões sobrando no pacote."`. (Review Focus 1.)
- [ ] **Step 3:** agenda, lista de clientes e `GET /api/clients`: os pacotes ativos do cliente passam a incluir os de que ele é membro. Como `include` de relação não aceita OR, buscar à parte `planSubscription.findMany({ where: { active: true, members: { some: { clientId: { in: ids } } } }, include: { plan: true, members: true } })` e juntar por cliente aos do titular, num helper local de cada página (sem duplicar o pacote).
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint` → OK. Manual (`npm run dev`): vender pacote com membro, concluir atendimento do membro "Pelo pacote", conferir saldo na ficha do titular; Reabrir e conferir que a sessão voltou e o pacote reativou (Review Focus 4).
- [ ] **Step 5:** commit `feat(pacotes): membros usam o saldo do pacote familiar`.

### Task 4: Excluir cliente com pacote familiar

**Files:**
- Modify: `src/app/api/clients/[id]/route.ts:~60-80`

**Interfaces:**
- Consumes: `pickSuccessor` (Task 1).

- [ ] **Step 1:** antes da transação, buscar os pacotes do titular com `members` e `plan`. Para cada um com `pickSuccessor(sub)` ≠ `null`, na transação: `planSubscription.update({ clientId: sucessor })` e apagar a linha de membro do sucessor; e trocar o `deleteMany` para apagar só os pacotes do titular que não foram transferidos. Os pagamentos ficam como hoje (`clientId: null`). Membros do cliente excluído saem por cascade.
- [ ] **Step 2:** `npm run typecheck && npm run lint` → OK. Manual: excluir titular de pacote familiar com saldo → pacote aparece na ficha do membro como titular; com saldo esgotado → some (Review Focus 3).
- [ ] **Step 3:** commit `feat(pacotes): pacote familiar passa ao membro mais antigo`.

### Task 5: Telas

Antes: skill `design-system`.

**Files:**
- Modify: `src/components/sell-plan-modal.tsx` (recebe `clients: { id; name; phone }[]`; seção "Quem mais usa este pacote" com `ClientCombobox` sem `allowCreate`, lista de chips removíveis, sem o titular; envia `memberIds`)
- Create: `src/components/plan-members-modal.tsx` (`PlanMembersModal({ subscriptionId, ownerId, members: { clientId; name }[], clients })` — adiciona/remove pelas rotas da Task 2, `router.refresh()`; mostra o erro da API)
- Modify: `src/app/clientes/[id]/page.tsx:38-60,139-175`

- [ ] **Step 1:** na ficha, carregar pacotes com `where: clientPlansWhere(id)`, `include: { plan: true, client: { select: { id, name } }, members: { include: { client: { select: { id, name } } } } }` e a lista `simple` de clientes para o seletor. Para cada pacote, buscar os atendimentos `DONE` com `planSubscriptionId` (uma consulta só, `in`) com cliente e `startTime`.
- [ ] **Step 2:** cada item da lista de pacotes: selo "Familiar" quando há membros; se o cliente da ficha não é o titular, linha "Titular: <nome>" com link para a ficha dele; se é o titular, botão "Membros" que abre `PlanMembersModal`; lista "Usos" (nome · data, mais recente primeiro) recolhível com `<details>`.
- [ ] **Step 3:** `npm run typecheck && npm run lint` → OK. Manual no celular (largura 390px) e no PC: vender com 2 membros, ver o pacote nas três fichas, remover um membro, ver o histórico.
- [ ] **Step 4:** commit `feat(pacotes): telas do pacote familiar`, e push.
