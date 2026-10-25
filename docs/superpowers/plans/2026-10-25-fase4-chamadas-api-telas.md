# Fase 4: chamadas à API nas telas, com erro sempre visível — Plano

> **Para quem executa:** skill `delegar`, com `test-driven-development`. Antes de mexer em texto de tela, skill `design-system` do projeto.

**Objetivo:** toda ação que grava algo (POST/PATCH/DELETE) passa por um helper único que nunca lança e sempre devolve a mensagem de erro; nenhuma tela finge sucesso quando a API recusou.

**Arquitetura:** `src/lib/api-client.ts` com `apiRequest` (puro, sem React). Cada componente troca o `fetch` manual por ele e mostra `error` no lugar de erro que já existe no formulário; onde não existe, uma linha de texto `text-sm text-red-600` (padrão já usado em `appointment-actions`/`payment-row-actions`). Carregamentos (GET) ficam como estão.

**Stack:** Next 16 (componentes `"use client"`), Vitest.

**Origem:** auditoria de 24/10/2026, item 9; bug: Concluir "pelo pacote" sem saldo não avisa nada.

## Restrições globais

- Textos novos em português, curtos, no tom do design system (ex.: "Não foi possível excluir. Tente de novo.").
- Mensagem da API (`{ error: string }`) tem prioridade sobre a genérica.
- Não mudar layout, cores nem fluxo; só acrescentar a mensagem de erro onde falta.
- `confirm()` nativo em `service-modal.tsx` fica (fora do escopo).

## Foco de revisão

- Concluir "pelo pacote" sem saldo mostra "Este cliente não tem sessões sobrando no pacote." e o cartão continua aberto.
- Sem internet: mensagem de conexão, botão volta a ficar ativo (loading desligado).
- Resposta de erro sem JSON (ex.: 500 HTML) → mensagem genérica, sem quebrar.
- Erro de validação do zod (`{ error: { fieldErrors... } }`) → mensagem genérica (não "[object Object]").
- Etiqueta do cliente que falha ao salvar volta ao estado anterior.

---

### Tarefa 1: helper `apiRequest`

**Arquivos:** criar `src/lib/api-client.ts`, `src/lib/api-client.test.ts`.

**Interface:**
```ts
export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: string; status: number };
/** fetch com JSON e erro padronizado; nunca lança. status 0 = sem conexão. */
export async function apiRequest<T = unknown>(
  url: string,
  init?: { method?: "POST" | "PATCH" | "DELETE"; body?: unknown },
  fallbackError?: string, // padrão: "Não foi possível concluir. Tente de novo."
): Promise<ApiResult<T>>
```
- Com `body`: `Content-Type: application/json` e `JSON.stringify`.
- Resposta ok: `data` = JSON (ou `null` se corpo vazio/não JSON).
- Erro: `error` = `json.error` se for string; senão `fallbackError`. Falha de rede: `{ ok: false, status: 0, error: "Sem conexão. Confira a internet e tente de novo." }`.

- [ ] Testes (com `vi.stubGlobal("fetch", ...)`): ok com JSON; ok sem corpo; 409 com `{ error: "x" }` → "x"; 400 com objeto zod → fallback; 500 HTML → fallback; fetch rejeita → status 0 e mensagem de conexão; body vira JSON com header.
- [ ] Implementar; `npm test`, typecheck, lint. Commit `feat: helper apiRequest com erro padronizado`.

### Tarefa 2: telas usam o helper e mostram o erro

**Arquivos:** `components/appointment-actions.tsx`, `payment-row-actions.tsx`, `block-slot-modal.tsx`, `blocked-slot-chip.tsx`, `service-modal.tsx`, `client-tags.tsx`, `delete-client-button.tsx`, `edit-client-form.tsx`, `edit-appointment-modal.tsx`, `new-appointment-modal.tsx`, `new-charge-modal.tsx`, `payment-button.tsx`, `sell-plan-modal.tsx`, `send-whatsapp-modal.tsx`, `message-settings-form.tsx`, `message-trigger-buttons.tsx`, `client-combobox.tsx`, `sync-button.tsx`, `app/clientes/novo/page.tsx`, `app/agenda/jornada/jornada-form.tsx`, `app/avaliacoes/avaliacoes-manager.tsx`, `app/conteudo-vitrine/galeria-manager.tsx`, `app/conteudo-vitrine/vitrine-form.tsx`, `app/clientes/importar/importar-client.tsx`.

- [ ] Em cada arquivo, cada `fetch` com método POST/PATCH/DELETE e corpo JSON → `apiRequest`; envio de `FormData`/upload e GETs ficam. O resultado `!ok` vai para o estado de erro do componente (criar `const [error, setError] = useState("")` onde não houver) e aparece na tela; `router.refresh()`/fechar só quando `ok`.
- [ ] `appointment-actions.tsx`: erro do `updateStatus` aparece no lugar do `notice` e o cartão de concluir/cancelar/reabrir **não** fecha quando dá erro.
- [ ] `client-tags.tsx`: em erro, volta `tags` ao valor anterior e mostra o erro.
- [ ] Verificação: `grep -rnE 'method: "(POST|PATCH|DELETE)"' src/components src/app --include=*.tsx` só pode achar uploads com FormData; typecheck, lint, test, build.
- [ ] Conferência no navegador (banco de teste): concluir pelo pacote sem saldo mostra o erro; excluir cobrança com o servidor parado mostra o erro de conexão.
- [ ] Commit `fix(telas): erros da API sempre aparecem; nada finge sucesso`.
