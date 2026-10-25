# Fase 5: dados consistentes sem migração — Plano

> **Para quem executa:** skill `delegar`, com `test-driven-development`.

**Objetivo:** o mesmo telefone não vira dois clientes, e renomear um serviço não deixa os atendimentos futuros "órfãos" (sem preço sugerido nem duração no Editar).

**Arquitetura:** funções de domínio puras/testadas; nenhuma mudança em `prisma/schema.prisma` (o projeto aplica SQL à mão no Supabase; esta fase não precisa).

**Escopo decidido (auditoria item 8, revisado em 25/10/2026):** centavos, Plan como catálogo e campo `source` ficam de fora — custo/risco maior que o ganho, e os pacotes acabaram de ser refeitos pelo Beto.

## Restrições globais

- Sem SQL em produção. Sem mudança de schema.
- Mensagens ao usuário iguais às atuais ("Telefone já cadastrado para …").
- Telefone gravado sempre só com dígitos e com o 55 na frente (formato que o cadastro e a vitrine já usam).

## Foco de revisão

- Editar o telefone de um cliente para o número de outro (escrito sem 55) → 409 "Telefone já cadastrado para outro cliente".
- Telefone com máscara "(11) 98888-7777", com "+55", com "0" de operadora na frente → mesmo número.
- Renomear serviço não mexe em atendimento passado, cancelado nem de outro serviço.
- Título "Ana - Massagem relaxante" com serviço "Massagem" renomeado para "Massagem tântrica" não pode virar "Ana - Massagem tântrica relaxante" (só troca o sufixo exato " - <nome antigo>").

---

### Tarefa 1: telefone normalizado em todas as gravações

**Arquivos:** criar `src/lib/domain/phone.ts`, `src/lib/domain/phone.test.ts`; modificar `src/app/api/clients/route.ts`, `src/app/api/clients/[id]/route.ts`, `src/app/api/contacts/import/route.ts`, `src/app/api/vitrine/agendar/route.ts`.

**Interfaces:**
- `normalizePhone(raw: string): string` — só dígitos; tira um "0" inicial; com 10 ou 11 dígitos acrescenta "55"; com 12 ou 13 começando por "55" mantém; outros casos devolve os dígitos.
- `phoneVariants(raw: string): string[]` — `[normalizado, sem o 55]` (sem repetição), para achar cadastros antigos gravados sem 55.

- [ ] Testes: `"(11) 98888-7777"`, `"+55 11 98888-7777"`, `"011988887777"`, `"5511988887777"` → `"5511988887777"`; fixo `"1133334444"` → `"551133334444"`; `phoneVariants("11988887777")` → `["5511988887777", "11988887777"]`.
- [ ] Implementar. Trocar: `clients` POST (o cálculo manual de `digits/local/phone`), `clients/[id]` PATCH (normalizar e, antes do update, procurar outro cliente com `phoneVariants` e `id: { not: id }` → 409 com a mensagem atual), `contacts/import` (normalizar antes do `findUnique` e do `create`, procurando com `phoneVariants`), `vitrine/agendar` (a `normalizePhone` local some; usar `phoneVariants` no lugar de `[\`55${phone}\`, phone]`, e gravar `normalizePhone`).
- [ ] Teste de rota não é necessário; `npm test`, typecheck, lint. Commit `fix(clientes): telefone normalizado em todas as gravações`.

### Tarefa 2: renomear serviço atualiza atendimentos futuros

**Arquivos:** criar `src/lib/domain/services.ts`, `src/lib/domain/services.test.ts`; modificar `src/app/api/servicos/[id]/route.ts`.

**Interface:** `renameServiceInFutureAppointments(tx: Tx, oldName: string, newName: string, now?: Date): Promise<{ id: string; googleEventId: string | null; title: string; startTime: Date; endTime: Date }[]>` — atendimentos com `serviceType === oldName`, `startTime >= now`, status ≠ CANCELLED: `serviceType = newName`; título: se termina com `" - " + oldName`, troca esse sufixo por `" - " + newName`. Devolve os alterados (para o Google).

- [ ] Testes: futuro muda serviço e título; passado não muda; cancelado não muda; outro serviço não muda; título sem o sufixo exato mantém o título e muda só `serviceType`.
- [ ] PATCH de serviço: se `name` mudou, `prisma.$transaction(async tx => { update do serviço; rename... })`; depois, fora da transação e best-effort, `updateCalendarEvent` de cada devolvido com `googleEventId` (em `after()`). Commit `fix(servicos): renomear serviço atualiza atendimentos futuros`.

### Tarefa 3: verificação

- [ ] `npm test`, typecheck, lint, build. Roteiro HTTP no banco de teste: criar cliente "(11) 97777-1111", editar outro cliente para "11977771111" → 409; renomear serviço e conferir atendimento futuro.
