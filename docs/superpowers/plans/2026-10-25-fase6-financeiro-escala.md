# Fase 6: Financeiro que não cresce com o histórico — Plano

> **Para quem executa:** skill `delegar`, com `test-driven-development`; skill `design-system` antes de mexer na tela.

**Objetivo:** a tela do Financeiro passa a carregar só uma página de lançamentos e a calcular os totais no banco, em vez de trazer todas as cobranças da história a cada visita.

**Arquitetura:** consultas em `src/lib/domain/finance.ts` (testadas no banco de teste); a página só monta a tela. A ordem da lista continua a de hoje: data do atendimento, ou do lançamento quando não há atendimento (mais recente primeiro).

## Restrições globais

- Números e ordem idênticos aos de hoje (mesmas regras: canceladas fora; "A receber" = `OPEN_PAYMENT_STATUSES`; recebido no mês por `paidAt` no mês de Brasília).
- Sem mudança de schema.
- Página de 50 lançamentos; "Ver mais" é um link (`?status=…&pagina=N`), botão em pílula `rounded-full min-h-11` no padrão do design system.

## Foco de revisão

- Empate de data (dois lançamentos no mesmo instante) não repete nem pula item entre páginas (desempate por `id`).
- Filtro + página juntos (`?status=pendentes&pagina=2`).
- `pagina` inválida (0, negativa, texto) → página 1.
- Mês do gráfico perto da virada (pago 01/11 às 01:00 de Brasília = 04:00 UTC conta em novembro; 31/10 23:30 de Brasília conta em outubro).
- Contadores dos filtros (quantos pendentes) continuam corretos com a lista paginada.

---

### Tarefa 1: consultas do Financeiro no domínio

**Arquivos:** criar `src/lib/domain/finance.ts`, `src/lib/domain/finance.test.ts`.

**Interfaces:**
```ts
export type FinanceFilter = "todas" | "pendentes" | "pagas";
export const FINANCE_PAGE_SIZE = 50;
/** Página da lista, na ordem da tela; hasMore indica se há próxima página. */
export async function listPayments(filter: FinanceFilter, page: number): Promise<{ items: (Payment & { client: Client | null; appointment: Appointment | null })[]; hasMore: boolean }>
/** Totais: em aberto (soma e quantidade) e quantidade por filtro. */
export async function financeTotals(): Promise<{ openSum: number; openCount: number; allCount: number; paidCount: number }>
/** Recebido por mês (paidAt no fuso de Brasília), para os meses pedidos, numa consulta só. */
export async function monthlyRevenue(months: { start: Date; end: Date }[]): Promise<number[]>
```
- `listPayments`: `$queryRaw` que devolve os ids na ordem `COALESCE(a."startTime", p."createdAt") DESC, p.id DESC`, com `LIMIT FINANCE_PAGE_SIZE + 1 OFFSET (page-1)*FINANCE_PAGE_SIZE` e o filtro de status; depois `findMany({ where: { id: { in } }, include })` e reordena pelos ids.
- `monthlyRevenue`: uma consulta (`$queryRaw` com `SUM(CASE WHEN paidAt >= start_i AND paidAt < end_i ...)` por mês, ou `groupBy` equivalente) — resultado igual ao de 6 `aggregate`.

- [ ] Testes: ordem (atendimento antigo criado depois aparece pela data do atendimento); paginação 51 itens → página 1 com 50 e `hasMore`, página 2 com 1; empate de data sem repetir; filtros; canceladas fora; `financeTotals` bate com a contagem manual; `monthlyRevenue` na virada do mês (casos do Foco).
- [ ] Implementar; `npm test`, typecheck, lint. Commit `feat(financeiro): consultas paginadas e totais no banco`.

### Tarefa 2: tela usa as consultas

**Arquivos:** modificar `src/app/financeiro/page.tsx`.

- [ ] `searchParams` ganha `pagina`; `page = Number.isInteger(n) && n >= 1 ? n : 1`.
- [ ] Trocar o `findMany` de todas as cobranças, os `filter/reduce` e as 6 agregações por `listPayments`, `financeTotals`, `monthlyRevenue`. O nome do pacote (`planName`) passa a ser buscado só para os itens da página.
- [ ] Abaixo da lista, se `hasMore`: link "Ver mais" para `?status=<filtro>&pagina=<page+1>` (sem `status` no filtro "todas"), estilo pílula do design system. Se `page > 1`, link "Voltar ao início" para a página 1.
- [ ] Typecheck, lint, build; conferência no navegador com o banco de teste (60 cobranças semeadas): página 1 com 50 e "Ver mais", página 2 com 10. Commit `perf(financeiro): lista paginada`.
