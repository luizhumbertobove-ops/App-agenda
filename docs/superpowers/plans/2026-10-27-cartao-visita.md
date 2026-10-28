# Cartão de visita novo — plano de execução

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gerar os 4 PDFs de impressão (frente, verso, máscaras de verniz) em CMYK, 88×48 mm com sangria, mais as prévias, do cartão novo do Humberto Bove.

**Architecture:** Uma página HTML (`cartao.html`) desenha as duas faces em pixels a 300 dpi e, por parâmetro de URL, mostra uma face só, normal ou como máscara de verniz. Um script Python dirige o Chrome headless para imprimir cada página em PDF, recorta a página no tamanho exato, converte para CMYK com Ghostscript e gera as prévias. Um segundo script verifica os arquivos entregues.

**Tech Stack:** HTML/CSS, Google Fonts (Montserrat 300/400, DM Sans 400/500), Chrome headless, Python 3 (`pypdfium2`, `Pillow`, `segno`, `zxing-cpp`), Ghostscript.

**Spec:** `docs/superpowers/specs/2026-10-27-cartao-visita-design.md`

## Global Constraints

- Formato final **88 × 48 mm**; sangria **3 mm** por lado → página **94 × 54 mm**.
- Régua: 300 dpi → 1 mm = 11,811 px. Cartão final 1039 × 567 px; página com sangria 1110 × 638 px; sangria = 35 px.
- Nada essencial abaixo de **15 px** (no desenho a 300 dpi); texto a ≥ 4 mm (47 px) da linha de corte, isto é, ≥ 82 px da borda da página.
- Cores do design system: marrom `#855e3e` (brown-500), creme `#fbf4e8` (linen-50), caixa do QR `#fffbf5` (linen-0), texto `#33281f`, dourado dos arcos `#f0d59a` (gold-200, um passo mais claro que o gold-300 do cartão atual, por causa da laminação fosca), bolinhas `#c9973f`.
- Nome sempre inteiro "Humberto Bove"; sem monograma. Serviços em sentence case.
- URL do QR: `https://appbeto-puce.vercel.app/vitrine/agendar`. QR preto sobre branco, nunca recolorido, nunca com verniz.
- Arquivos-fonte em `impressos/cartao/`; saída em `impressos/cartao/saida/` (fora do git); entrega copiada para `~/Downloads/Cartao Humberto Bove - grafica/`.

## Review Focus

- QR que lê outro endereço (o antigo) ou não lê depois da redução/conversão → `verificar.py` decodifica o QR do PDF CMYK final.
- Fio branco ou deslocamento na borda (o Chrome arredonda a página) → `verificar.py` checa as 4 bordas de cada página.
- Fonte que não carregou (cai em Arial) e muda o desenho → `build.py` falha se `document.fonts.check` der falso para Montserrat 300.
- Máscara de verniz desalinhada da arte → mesmo HTML e mesma geometria; `verificar.py` compara tamanho de página e confere que a máscara tem só preto e branco.
- Texto encostado no corte → verificação visual da prévia recortada; constantes de margem fixadas no CSS.

---

### Task 1: Ferramentas e QR novo

**Files:**
- Create: `impressos/cartao/gerar_qr.py`
- Create: `impressos/cartao/qr-agendamento.svg` (gerado)
- Modify: `.gitignore` (adicionar `.superpowers/` e `impressos/cartao/saida/`)

**Interfaces:**
- Produces: `qr-agendamento.svg` — QR vetorial, módulos `#000`, fundo `#fff`, quiet zone 2 módulos, correção de erro M.

- [ ] **Step 1:** Instalar Ghostscript: `winget install --id ArtifexSoftware.GhostScript -e --accept-package-agreements --accept-source-agreements`; depois `pip install --user segno zxing-cpp pypdfium2 pillow`.
- [ ] **Step 2:** Confirmar: `gswin64c -v` imprime versão (o executável fica em `C:\Program Files\gs\gs*\bin\`; o script resolve o caminho por glob).
- [ ] **Step 3:** Escrever `gerar_qr.py` com `segno.make(URL, error='m')` salvando SVG com `scale=10, border=2, dark='#000', light='#fff'`.
- [ ] **Step 4:** Rodar e verificar: renderizar o SVG pelo Chrome (screenshot 600×600) e decodificar com `zxingcpp.read_barcodes` → texto igual à URL.
- [ ] **Step 5:** Commit `chore(cartao): QR do agendamento e ignorar saídas`.

### Task 2: Arte do cartão em HTML

**Files:**
- Create: `impressos/cartao/cartao.html`

**Interfaces:**
- Consumes: `qr-agendamento.svg` (Task 1).
- Produces: URL params — `?face=frente|verso` (obrigatório) e `&verniz=1` (máscara). Cada combinação mostra uma página de 1110 × 638 px. A página expõe `window.prontoParaImprimir` (Promise) que resolve depois de `document.fonts.ready` e rejeita se `document.fonts.check('300 40px Montserrat')` for falso.

- [ ] **Step 1:** Montar a frente (spec, "Frente"): fundo marrom ocupando a página toda (sangria incluída); "Consultório — Serrana, SP" DM Sans 500 15 px tracking .14em; nome Montserrat 300 ~92 px; "MASSOTERAPEUTA" Montserrat 400 28 px tracking .5em, creme, sem fios; arcos (círculos r = 70/110/150 px, traço 1,5 px, `#f0d59a`) com centro nos cantos de corte inferior-esquerdo e superior-direito, desenhados como círculos inteiros para continuarem na sangria.
- [ ] **Step 2:** Montar o verso (spec, "Verso"): fundo creme na página toda; coluna marrom à direita com raio 18 px, QR em caixa `#fffbf5` com 12 px de respiro e ≥ 170 px de lado, legenda "AGENDE PELO CELULAR" 16 px; à esquerda "ATENDIMENTOS" + 9 serviços em duas colunas (21 px), hairline, contatos em grade 2×2 (telefone 23 px 500, demais 20 px), ícones Lucide inline (phone, instagram, map-pin, clock).
- [ ] **Step 3:** Modo `verniz=1`: fundo branco; frente com nome, MASSOTERAPEUTA e arcos em `#000`; verso com a coluna em `#000` e um recorte branco do tamanho da caixa do QR + 2 mm (24 px) de folga. Todo o resto some (`visibility:hidden`), mantendo a geometria.
- [ ] **Step 4:** Verificar no Chrome (screenshot 1110×638 das 4 combinações) e comparar com a opção C escolhida nas telas de comparação; conferir margens de 82 px.
- [ ] **Step 5:** Commit `feat(cartao): arte do cartão novo 88x48 com máscaras de verniz`.

### Task 3: Build e verificação

**Files:**
- Create: `impressos/cartao/build.py`
- Create: `impressos/cartao/verificar.py`

**Interfaces:**
- Consumes: `cartao.html` e seus params (Task 2).
- Produces: em `saida/` — `frente.pdf`, `verso.pdf`, `frente-verniz.pdf`, `verso-verniz.pdf` (CMYK, 94×54 mm), `previa-frente.png`, `previa-verso.png` (recortadas, 1039×567, 300 dpi), `previa-cmyk-frente.png`, `previa-cmyk-verso.png` (renderização do PDF CMYK, para conferir a cor).

- [ ] **Step 1: Escrever `verificar.py` primeiro** — para cada PDF: 1 página; tamanho 94,0 × 54,0 mm (±0,05); renderizado a 600 dpi sem nenhum pixel `(255,255,255)` nas 4 bordas (só arte, não máscaras); espaço de cor CMYK (`/DeviceCMYK` ou ICC N=4 no conteúdo); fontes embutidas. Máscaras: só pixels pretos ou brancos (tolerância de antialias). Verso: `zxingcpp` lê a URL exata no render do PDF CMYK. Sai com código ≠ 0 e lista o que falhou.
- [ ] **Step 2:** Rodar `python -I verificar.py` → FAIL (arquivos inexistentes).
- [ ] **Step 3:** Escrever `build.py`: para cada combinação, Chrome headless `--print-to-pdf` com `@page{size:94mm 54mm}` (aguardando `prontoParaImprimir`, `--virtual-time-budget=15000`); recortar MediaBox/CropBox para 266,46 × 153,07 pt a partir do topo (pypdfium2); converter com `gswin64c -sDEVICE=pdfwrite -sColorConversionStrategy=CMYK -sProcessColorModel=DeviceCMYK -dOverrideICC -dPDFSETTINGS=/prepress`; máscaras viram preto 100% K; screenshots para as prévias, recortadas 35 px de cada lado e salvas com `dpi=(300,300)`.
- [ ] **Step 4:** Rodar `python -I build.py && python -I verificar.py` → tudo OK.
- [ ] **Step 5:** Olhar `previa-cmyk-*.png` e as prévias recortadas; comparar o marrom antes/depois da conversão.
- [ ] **Step 6:** Commit `feat(cartao): build CMYK e verificação dos arquivos de impressão`.

### Task 4: Entrega

- [ ] **Step 1:** Copiar os 4 PDFs e as 2 prévias recortadas para `~/Downloads/Cartao Humberto Bove - grafica/` (substituindo os antigos; mover os antigos para `antigo/`).
- [ ] **Step 2:** Escrever no chat o texto pronto para a gráfica (formato, sangria, CMYK, verniz pelas máscaras, sem marcas de corte) e os avisos: prova de cor e teste do QR no celular.
- [ ] **Step 3:** Commit e push da branch, conforme a preferência registrada.
