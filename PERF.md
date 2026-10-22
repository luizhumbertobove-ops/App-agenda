# Performance — medições e tentativas

Registro de cada medição e de cada tentativa de otimização (mantidas e revertidas), para não repetir ideia que já falhou. Siga a skill `performance-optimization`: medir antes, mudar uma coisa por vez, medir de novo do mesmo jeito.

## Como medir

- Produção: `https://appbeto-puce.vercel.app`
- Chrome DevTools emulando celular: viewport 412×915 (DPR 2,625), rede **Slow 4G**, CPU **4× mais lenta**, cache do navegador ignorado.
- Vitrine: trace de performance (LCP e CLS). Painel: Navigation Timing + LCP, logado.
- Pelo menos 2 medições por página; diferença menor que a oscilação não conta como ganho.

## Linha de base — 22/10/2026

| Página | LCP | CLS | JS (transferido) | Elementos | Situação |
|---|---|---|---|---|---|
| `/vitrine` | 3,42 s · 3,44 s | 0,00 | 148 KB | 265 | ❌ acima de 2,5 s |
| `/` (início) | 1,95 · 2,00 · 2,00 s | — | 145 KB | 237 | ✅ |
| `/agenda` | 1,77 · 1,66 s | — | 158 KB | 288 | ✅ |
| `/clientes` | 2,01 · 1,96 s | — | 141 KB | 726 | ✅ |
| `/financeiro` | 2,04 · 1,97 s | — | 145 KB | 761 | ✅ |

### Gargalo da vitrine

LCP = foto do topo (`imagemTopo`, `src/app/vitrine/page.tsx`). Decomposição: servidor 13 ms, atraso até começar a baixar 616 ms, **download 2,6 s**, renderização 170 ms.

- A foto começa com prioridade **Low**: `priority` foi descontinuado no Next 16 e o HTML não sai com `fetchpriority="high"`.
- Sem `sizes`, o navegador assume 100vw e baixa a versão de 1200 px (exibida com ~364 px de largura). Mesmo problema em `imagemMissao`. Desperdício estimado: ~120 KB.

## Tentativas

| Ideia | Antes → Depois | Veredito | Por quê |
|---|---|---|---|
| — | — | — | — |
