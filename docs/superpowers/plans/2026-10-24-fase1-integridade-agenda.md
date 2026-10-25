# Integridade da Agenda e do Financeiro (Fases 1 + 3 da auditoria) — Plano

> **Para quem executa:** siga a skill `delegar` (protocolo do usuário) tarefa a tarefa, com `test-driven-development`. Passos usam checkbox (`- [ ]`).

**Objetivo:** toda operação que mexe em agenda + financeiro roda numa transação única, o conflito de horário é verificado do mesmo jeito no admin e na vitrine, e essa lógica passa a ter testes automatizados.

**Arquitetura:** a regra de negócio sai das rotas para `src/lib/domain/` (funções que recebem dados e falam só com o banco). As rotas ficam finas: validam com zod, chamam o domínio, traduzem `DomainError` em HTTP e disparam os efeitos externos (Google Agenda, WhatsApp) **depois** da transação. Todas as escritas que mexem em horário rodam dentro de `withScheduleLock` (transação + `pg_advisory_xact_lock(424242)`, a mesma trava que a vitrine já usa).

**Stack:** Next 16, Prisma 7 (`@prisma/adapter-pg`), Postgres (Supabase em produção), Vitest + Postgres 16 em Docker para testes.

**Origem:** auditoria de 24/10/2026 (conversa), itens 1, 2, 3, 4, 11 e 12.

## Restrições globais

- Testes **nunca** tocam o banco de produção: o setup aborta se a URL de teste não apontar para `localhost`/`127.0.0.1`.
- Banco de teste: container `app-beto-testdb`, imagem `postgres:16-alpine`, porta `54329`, URL `postgresql://postgres:test@localhost:54329/app_beto_test`.
- Trava de agenda: chave `424242` (já usada em produção pela vitrine; não mudar).
- Mensagens de erro ao usuário continuam em português e iguais às atuais (ex.: "Este atendimento já foi concluído.", "Este cliente não tem sessões sobrando no pacote.").
- Efeitos externos (Google Agenda, WhatsApp, Mercado Pago) ficam fora das funções de domínio e fora da transação.
- Não alterar `prisma/schema.prisma` nesta fase (mudanças de modelo são a fase 5).
- Código e comentários seguem o estilo do projeto: comentários curtos em português explicando o porquê.

## Foco de revisão

- Recorrência de 52 semanas tem que caber no timeout da transação (15 s) — teste dedicado na Tarefa 2.
- Concluir o mesmo atendimento duas vezes ao mesmo tempo gera **um** lançamento só — teste na Tarefa 3.
- Reabrir atendimento pago via Mercado Pago não apaga nem altera esse pagamento — teste na Tarefa 3.
- Editar só observações de um atendimento que hoje sobrepõe um bloqueio criado depois **não** pode dar conflito (a checagem só roda quando o horário muda) — teste na Tarefa 4.
- Evento apagado no Google de um atendimento já concluído continua concluído — teste na Tarefa 4.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `vitest.config.ts` | Config do Vitest (alias `@/`, `globalSetup`, `fileParallelism: false`, env de teste) |
| `scripts/test-db.mjs` | Sobe (ou reaproveita) o container do banco de teste |
| `src/test/global-setup.ts` | Guarda de segurança da URL + `prisma db push` no banco de teste |
| `src/test/db.ts` | `resetDb()` e fábricas de dados (`makeClient`, `makeAppointment`, `makeBlock`, `makePlan`) |
| `src/lib/domain/errors.ts` | `DomainError` |
| `src/lib/domain/constants.ts` | `OPEN_PAYMENT_STATUSES` |
| `src/lib/domain/schedule.ts` | `withScheduleLock`, `findConflict` |
| `src/lib/domain/appointments.ts` | `createAppointments`, `updateAppointment`, `cancelAppointment` |
| `src/lib/domain/payments.ts` | `findReusablePayment`, `isPaidAmountValid` |
| `src/lib/domain/*.test.ts` | Testes de cada módulo, ao lado do código |

---

### Tarefa 1: Infra de testes + detecção de conflito

**Arquivos:**
- Criar: `vitest.config.ts`, `scripts/test-db.mjs`, `src/test/global-setup.ts`, `src/test/db.ts`, `src/lib/domain/errors.ts`, `src/lib/domain/constants.ts`, `src/lib/domain/schedule.ts`, `src/lib/domain/schedule.test.ts`
- Modificar: `package.json` (devDependency `vitest`; scripts `"test:db": "node scripts/test-db.mjs"`, `"test": "vitest run"`)

**Interfaces:**
- Produz:
  - `class DomainError extends Error { constructor(message: string, readonly status: 400 | 404 | 409 | 422) }`
  - `const OPEN_PAYMENT_STATUSES = ["PENDING", "SENT", "OVERDUE"] as const`
  - `type Tx = Prisma.TransactionClient` (de `@/generated/prisma/client`)
  - `withScheduleLock<T>(fn: (tx: Tx) => Promise<T>): Promise<T>` — `prisma.$transaction` com `{ timeout: 15_000 }`; primeira instrução `SELECT pg_advisory_xact_lock(424242)`
  - `findConflict(tx: Tx, range: { start: Date; end: Date }, opts?: { excludeAppointmentId?: string }): Promise<{ kind: "appointment" | "blocked"; startTime: Date } | null>` — sobreposição estrita (`start < end` e `end > start`), ignora `CANCELLED`, considera `BlockedSlot`
  - `src/test/db.ts`: `resetDb(): Promise<void>` (TRUNCATE de todas as tabelas do schema, `CASCADE`), `makeClient(data?)`, `makeAppointment(data)`, `makeBlock(start, end)`, `makePlanSubscription(clientId, sessions, sessionsUsed?)`

- [ ] **Passo 1:** `scripts/test-db.mjs`: `docker start app-beto-testdb`; se falhar, `docker run -d --name app-beto-testdb -e POSTGRES_PASSWORD=test -e POSTGRES_DB=app_beto_test -p 54329:5432 postgres:16-alpine`; espera `pg_isready` dentro do container (até 30 s). Rodar `npm run test:db` → container ativo.
- [ ] **Passo 2:** `vitest.config.ts` define `test.env.DATABASE_URL` com a URL das Restrições globais, `globalSetup: "src/test/global-setup.ts"`, `fileParallelism: false`, alias `@` → `src`. `global-setup.ts` lança erro se o host da URL não for `localhost`/`127.0.0.1`, depois roda `npx prisma db push --force-reset` com essa `DATABASE_URL` no env (no Prisma 7 confirme as flags com `npx prisma db push --help`).
- [ ] **Passo 3: teste que falha** — `schedule.test.ts` (com `beforeEach(resetDb)`):
  ```ts
  it("acha atendimento sobreposto", ...)        // appt 10–11h; range 10:30–11:30 → { kind: "appointment" }
  it("ignora atendimento cancelado", ...)       // appt CANCELLED 10–11h → null
  it("encostar não é conflito", ...)            // appt 10–11h; range 11–12h → null
  it("acha bloqueio", ...)                      // block 14–16h; range 15–16h → { kind: "blocked" }
  it("exclui o próprio atendimento", ...)       // excludeAppointmentId = id do appt → null
  it("trava serializa", ...)                    // duas withScheduleLock simultâneas que fazem findConflict + create no mesmo horário → exatamente uma cria
  ```
- [ ] **Passo 4:** `npm test` → FAIL (módulo não existe).
- [ ] **Passo 5:** implementar `errors.ts`, `constants.ts`, `schedule.ts`.
- [ ] **Passo 6:** `npm test` → PASS (6 testes).
- [ ] **Passo 7:** commit `test: infra de testes com Postgres e detecção de conflito de horário`.

---

### Tarefa 2: Criar atendimento (com recorrência) numa transação; vitrine usa o mesmo conflito

**Arquivos:**
- Criar: `src/lib/domain/appointments.ts`, `src/lib/domain/appointments.create.test.ts`
- Modificar: `src/app/api/appointments/route.ts` (POST), `src/app/api/vitrine/agendar/route.ts:107-138`

**Interfaces:**
- Consome: `withScheduleLock`, `findConflict`, `DomainError` (Tarefa 1)
- Produz:
  - `type CreateAppointmentInput = { clientId: string | null; isPartner: boolean; partnerName?: string; serviceType: string; start: Date; end: Date; notes?: string; amount?: number; repeatWeeks?: number }`
  - `createAppointments(input: CreateAppointmentInput): Promise<(Appointment & { client: Client | null })[]>` — ordem crescente; tudo numa `withScheduleLock`

- [ ] **Passo 1: teste que falha:**
  ```ts
  it("cria 4 semanas com o mesmo recurrenceId")        // repeatWeeks 4 → 4 linhas, startTime +7 dias cada, mesmo recurrenceId
  it("conflito na 3ª semana não cria nenhuma")          // appt existente em start+14d → rejects DomainError status 409; count = 0
  it("bloqueio conta como conflito")                     // block em start+7d → 409
  it("cobrança só na primeira ocorrência")               // amount 150, repeatWeeks 3 → 1 Payment PENDING 150 ligado ao 1º
  it("cliente inexistente → 404")
  it("fim antes do início → 400")
  it("52 semanas cabem na transação")                   // repeatWeeks 52 → 52 linhas
  ```
  Mensagem de conflito igual à atual: `Conflito de horário com outro agendamento em DD/MM/AAAA` (data da sobreposição, fuso de Brasília). Para bloqueio: `Horário bloqueado em DD/MM/AAAA`.
- [ ] **Passo 2:** `npm test` → FAIL.
- [ ] **Passo 3:** implementar `createAppointments`. Criações **sequenciais** dentro do `tx` (não `Promise.all`).
- [ ] **Passo 4:** POST da rota: valida (zod igual ao atual), chama `createAppointments`, `catch` de `DomainError` → `{ error }` com o `status`. Depois da transação, cria o evento no Google para **cada** ocorrência (best-effort, sequencial) e grava o `googleEventId`.
- [ ] **Passo 5:** vitrine: troca o `$transaction` + `pg_advisory_xact_lock` + checagem própria por `withScheduleLock` + `findConflict` (resto da rota igual).
- [ ] **Passo 6:** `npm test` → PASS; `npm run typecheck` → sem erros.
- [ ] **Passo 7:** commit `fix(agenda): criar atendimento e recorrência numa transação, com bloqueios`.

---

### Tarefa 3: Concluir e Reabrir numa transação

**Arquivos:**
- Modificar: `src/lib/domain/appointments.ts`
- Criar: `src/lib/domain/appointments.update.test.ts`

**Interfaces:**
- Produz:
  - `type UpdateAppointmentInput = { status?: AppointmentStatus; serviceType?: string; clientId?: string; startTime?: Date; endTime?: Date; notes?: string | null; sessionNotes?: string | null; cancelReason?: string; charge?: { amount: number; paid: boolean } | null; usePlan?: boolean; isPartner?: boolean; partnerName?: string }`
  - `type UpdateAppointmentResult = { appointment: Appointment & { client: Client | null }; previousClient: Client | null; googleEventId: string | null; keptPayments: number; cancelled: boolean; calendarChanged: boolean }`
  - `updateAppointment(id: string, input: UpdateAppointmentInput): Promise<UpdateAppointmentResult>` — **tudo** dentro de uma `withScheduleLock`, relendo o atendimento dentro do `tx`. Esta tarefa implementa os ramos concluir/reabrir; a Tarefa 4 completa os demais.

- [ ] **Passo 1: teste que falha** (regras atuais de [appointments/[id]/route.ts](../../../src/app/api/appointments/[id]/route.ts), agora atômicas):
  ```ts
  it("concluir com 'já recebi' cria Payment PAID com paidAt = startTime (atendimento passado), fromCompletion true")
  it("concluir reaproveita a cobrança em aberto e guarda preCompletionStatus/Amount")
  it("concluir sem cobrança cancela a cobrança em aberto")
  it("pelo pacote sem saldo → 409 e status não muda")
  it("pelo pacote usa o mais antigo com saldo; última sessão desativa o pacote")
  it("concluir duas vezes ao mesmo tempo → um 409 e um só Payment")
  it("reabrir apaga o lançamento do Concluir, restaura a cobrança e devolve a sessão do pacote")
  it("reabrir mantém pagamento PAID com mpPaymentId e conta em keptPayments")
  ```
- [ ] **Passo 2:** `npm test` → FAIL.
- [ ] **Passo 3:** mover a lógica de concluir/reabrir para `updateAppointment`, usando `tx` em tudo. O "já concluído" vira checagem do status relido dentro da transação (a trava serializa).
- [ ] **Passo 4:** `npm test` → PASS.
- [ ] **Passo 5:** commit `fix(agenda): concluir e reabrir atômicos`.

---

### Tarefa 4: Cancelar, remarcar e editar; rotas ficam finas

**Arquivos:**
- Modificar: `src/lib/domain/appointments.ts`, `src/lib/domain/appointments.update.test.ts`, `src/app/api/appointments/[id]/route.ts` (PATCH e DELETE), `src/app/api/calendar/sync/route.ts:53-68`

**Interfaces:**
- Consome: `updateAppointment` (Tarefa 3)
- Produz: `cancelAppointment(id: string, opts?: { reason?: string; keepDone?: boolean }): Promise<{ cancelled: boolean; googleEventId: string | null }>` — transação; marca `CANCELLED`, passa cobranças `OPEN_PAYMENT_STATUSES` para `CANCELLED`; com `keepDone`, atendimento `DONE` não muda (`cancelled: false`).

- [ ] **Passo 1: teste que falha:**
  ```ts
  it("cancelar via update cancela cobranças em aberto e mantém as pagas")
  it("remarcar para horário ocupado → 409; para horário com bloqueio → 409")
  it("editar só observações não checa conflito (bloqueio criado depois sobre o horário)")
  it("ligar cliente: título vira 'Nome - Serviço' e cobranças sem cliente passam ao cliente")
  it("marcar parceria: clientId null, título com partnerName")
  it("cancelAppointment keepDone não mexe em atendimento DONE")
  it("cancelAppointment com motivo grava cancelReason")
  ```
- [ ] **Passo 2:** `npm test` → FAIL.
- [ ] **Passo 3:** completar `updateAppointment` (cancelamento, conflito só quando `startTime`/`endTime` vierem, título, cliente/parceria, cobranças sem cliente) e criar `cancelAppointment`.
- [ ] **Passo 4:** PATCH: zod igual ao atual → `updateAppointment` → depois, fora da transação, WhatsApp de falta (`noShow === "true"`, regra atual) e Google (apaga se `cancelled`; atualiza se `calendarChanged`). Resposta `{ ...appointment, keptPayments }` (formato atual). DELETE: `cancelAppointment(id, { reason })` + apaga o evento. Sync: `cancelAppointment(appt.id, { reason: "Apagado no Google Agenda", keepDone: true })`.
- [ ] **Passo 5:** `npm test` → PASS; `npm run typecheck` e `npm run lint` → limpos. A rota PATCH deve ficar abaixo de ~100 linhas.
- [ ] **Passo 6:** commit `refactor(agenda): regras de atendimento no domínio, rotas finas`.

---

### Tarefa 5: Cobrança Pix sem duplicar e webhook rigoroso

**Arquivos:**
- Criar: `src/lib/domain/payments.ts`, `src/lib/domain/payments.test.ts`
- Modificar: `src/app/api/payments/send/route.ts:43-63`, `src/app/api/payments/webhook/route.ts:47-49`

**Interfaces:**
- Produz:
  - `findReusablePayment(appointmentId: string): Promise<Payment | null>` — cobrança mais recente do atendimento com status em `OPEN_PAYMENT_STATUSES`
  - `isPaidAmountValid(paid: unknown, expected: number): boolean` — `true` só se `paid` for número finito e `|paid - expected| < 0.01`

- [ ] **Passo 1: teste que falha:**
  ```ts
  it("reaproveita cobrança OVERDUE")              // Payment OVERDUE do atendimento → retorna ela
  it("ignora PAID e CANCELLED")                   // → null
  it("valor ausente não vale como pago")          // isPaidAmountValid(undefined, 150) === false
  it("valor igual vale"); it("valor diferente não vale")   // 150 vs 150 → true; 149 vs 150 → false
  ```
- [ ] **Passo 2:** `npm test` → FAIL.
- [ ] **Passo 3:** implementar; em `payments/send` buscar a reaproveitável **antes** de `createPixCharge`; no webhook usar `isPaidAmountValid`.
- [ ] **Passo 4:** `npm test` → PASS.
- [ ] **Passo 5:** commit `fix(financeiro): Pix reaproveita cobrança vencida e webhook exige valor`.

---

### Tarefa 6: Verificação final

- [ ] `npm test` → todos passam; `npm run typecheck`, `npm run lint`, `npm run build` → sem erros.
- [ ] Rodar o app apontando para o banco de teste (nunca o `.env` de produção): `DATABASE_URL=postgresql://postgres:test@localhost:54329/app_beto_test npm run dev`, e conferir no navegador: criar atendimento recorrente, concluir "já recebi", reabrir, cancelar, remarcar sobre um bloqueio (deve recusar).
- [ ] Atualizar `README.md` com a seção "Testes" (`npm run test:db` e depois `npm test`).
