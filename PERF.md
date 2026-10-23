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

## Nova linha de base — 22/10/2026, depois da galeria, das avaliações e das animações (`ace58fe`)

| Página | LCP | CLS | JS | Fontes | Imagens | Elementos |
|---|---|---|---|---|---|---|
| `/vitrine` | 3,91 s · 3,92 s | 0,00 | **208 KB** (+60 KB) | 96 KB (5 arquivos, todos pré-carregados) | 129 KB (WebP) | 282 |

Decomposição do LCP: servidor 14 ms, atraso 617 ms, **download 3,07 s** (antes 2,6 s), renderização 190 ms. A foto do topo agora está em `src/components/vitrine/parallax-photo.tsx` e ocupa a largura toda no celular (408 px).

- A hipótese do `sizes` caiu: com 100vw numa tela de densidade 2,625, o navegador precisa de ~1080 px, e a versão de 1200 px é a correta. O "desperdício" que o Chrome aponta conta pixels de tela 1×.
- O que mais pesa agora: JS (+60 KB, `motion` e galeria) e as 5 fontes pré-carregadas, que disputam a banda com a foto.

## Tentativas

| Ideia | Antes → Depois | Veredito | Por quê |
|---|---|---|---|
| Foto do topo com `loading="eager" fetchPriority="high"` no lugar de `priority` (commit `5226604`) | LCP 3,42 / 3,44 s → 3,42 / 3,44 s | revertido (`a6a8668`) | Neutro. A prioridade passou a High, mas o atraso (613 ms) e o download (2,6 s) não mudaram: no Slow 4G a foto disputa banda com fontes, CSS (113 KB) e JS (148 KB). O gargalo é o volume total de dados, não a prioridade. |
| Fotos em AVIF antes de WebP (`images.formats` no `next.config.ts`, commit `18c78b8`) | LCP 3,91 / 3,92 s → 3,51 / 3,35 s | **mantido** | Foto do topo 76 KB → 51 KB, foto da missão 54 KB → 41 KB. Download da foto do topo 3,07 s → 2,68 s. A primeira visita a cada tamanho de foto é mais lenta (a Vercel codifica o AVIF uma vez e guarda). |
| Spectral com `preload: false` em `src/app/layout.tsx` (commit `6bf30c5`) | LCP 3,51 / 3,35 s → 3,01 / 3,10 / 3,11 s | **mantido** | Só a DM Sans continua pré-carregada. As variações da Spectral passam a baixar depois da foto (aos ~3,9 s), e só as usadas: a 400 itálico nem é baixada na vitrine. Fontes 96 KB → 81 KB; download da foto 2,68 s → 2,43 s. CLS 0,001, sem salto visível. Uma medição descartada (4,8 s): a gravação começou com 2,2 s de atraso antes até do HTML. |
