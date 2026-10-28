# Cartão de visita novo — design

## Intenção

Refazer o cartão de visita do Humberto Bove a partir de um modelo que o Beto gostou (frente escura com o nome centralizado, verso claro com serviços e coluna do QR), mantendo a identidade da marca, e entregar à gráfica os arquivos prontos para a especificação contratada. O QR leva direto ao agendamento online.

## Especificação da gráfica

- Couchê fosco 300 g, 1000 unidades.
- Formato final **88 × 48 mm**; impressão 4x4 (CMYK frente e verso).
- Laminação fosca e **verniz localizado frente e verso** — exige uma máscara de verniz por lado.

## Decisões

- **Estrutura:** opção C das telas de comparação (modelo + arcos da marca).
- **Frente (marrom Bove `#855e3e`):** "Consultório — Serrana, SP" no topo (DM Sans, caixa alta, 15 px+); "Humberto Bove" em **Montserrat Light**, grande, centralizado; abaixo, "MASSOTERAPEUTA" em Montserrat Regular, creme, ~28 px, tracking largo, sem fios, com a largura próxima à do nome; arcos dourados no canto inferior esquerdo e superior direito.
- **Verso (creme):** à esquerda, "ATENDIMENTOS" + os 9 serviços em duas colunas (sentence case), hairline, e contatos em grade — telefone em destaque, @spalhum, endereço, horário. À direita, coluna marrom com o QR numa caixa creme e "AGENDE PELO CELULAR".
- **Conteúdo:** tudo o que o cartão atual tem (9 serviços, telefone, Instagram, endereço, horário).
- **QR novo:** aponta para `https://appbeto-puce.vercel.app/vitrine/agendar`; gerado como vetor, preto sobre branco, e testado por leitura antes da entrega.
- **Verniz:** frente — nome, MASSOTERAPEUTA e arcos. Verso — a coluna marrom do QR, **sem** a caixa do QR e com folga em volta (o brilho atrapalha a leitura pela câmera).
- **Legibilidade:** nada essencial abaixo de 15 px no tamanho real (régua: 1039 px = 88 mm a 300 dpi); texto a pelo menos 4 mm da linha de corte.
- **Sangria:** 3 mm por lado, salvo se a gráfica pedir outra; página com sangria 94 × 54 mm.
- **Laminação fosca:** dourado dos arcos um passo mais claro para não apagar sob o fosco.

## Abordagens

1. PDF RGB pelo Chrome, gráfica converte — rápido, mas a cor do marrom fica fora do nosso controle.
2. **(escolhida)** Mesmo pipeline (HTML → Chrome headless → PDF vetorial) e conversão para **CMYK com Ghostscript** (perfil ISO Coated / FOGRA39), com prévia da cor convertida antes do envio.
3. Refazer em Inkscape/Scribus — mais "profissional", mas pesado demais para um cartão.

## Entrega

- `frente.pdf`, `verso.pdf` (CMYK, com sangria) e `frente-verniz.pdf`, `verso-verniz.pdf` (preto 100% onde há verniz, mesma geometria).
- PNGs de prévia já recortados no tamanho final.
- Cada página verificada: tamanho exato, sem fio branco na borda, fontes embutidas, QR lido corretamente.

## Fora do escopo (próximo passo)

Adotar Montserrat como tipografia da marca no design system, no site e no app — vira um plano próprio depois que o cartão estiver pronto. Até lá, a Montserrat vale só no cartão.

## Fica com quem constrói

Ajuste fino de espaçamentos na nova proporção, tamanho exato do nome, posição dos arcos.
