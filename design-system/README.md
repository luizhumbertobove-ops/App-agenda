# Humberto Bove Massoterapia — design system

> Cópia do design system publicado no Claude (artefato "Humberto Bove Massoterapia"). O artefato é a fonte; esta pasta é o espelho que o código consulta.

Humberto Bove é massoterapeuta independente, num único consultório: uma agenda curta, um terapeuta, poucos serviços e clientes que voltam. O sistema serve às duas superfícies digitais que um consultório assim precisa — o **site do consultório** (uma página: o que são as sessões, quem é o Humberto, quanto custa, um formulário para agendar) e o **app do Humberto** (o app de trabalho: agenda, clientes, financeiro, mensagens de WhatsApp e serviços), além da **vitrine**, onde o cliente agenda sozinho — e aos impressos (cartão de visita, QR de agendamento).

Tudo em **português do Brasil**. Valores em reais, horas no relógio de 24h, datas como `13 set`.

## Conteúdo

A voz é a do Beto falando com quem chega: calorosa, próxima e concreta — o registro de quem recebe você pelo nome, explica o que vai fazer no seu corpo antes de fazer e se despede com um "até a próxima". Acolhedora sem virar folheto de spa.

- **Pessoa.** Humberto fala como **eu** sobre o próprio trabalho ("Atendo desde 2014", "Reservo 15 minutos extras"). O cliente é **você**, nunca "o cliente" em texto voltado ao cliente. Nada de "nós": há uma pessoa só aqui.
- **Registro.** Português cotidiano e afetuoso: frases inteiras, saudações pelo primeiro nome ("Oi, Ana"), convites em vez de ordens (*"Que tal reservar seu horário?"*). Sem gíria pesada, sem anglicismos (*agendar*, não *bookar*; *pacote*, não *plano premium*).
- **Caixa.** Sentence case em títulos, botões e rótulos: `Ver horários`, não `Ver Horários`. A única caixa alta é o eyebrow (estilo `eyebrow`, classe `.ds-eyebrow`): `SERVIÇOS`, `MASSOTERAPIA`, `VALORES`.
- **Tamanho.** Títulos de 2 a 5 palavras, podem ser uma frase com ponto: *"Respirar fundo, sair leve."* Leads de duas frases, até ~35 palavras. Helper text de uma oração: *"Só para confirmar o horário."*
- **O que o texto faz.** Tira dúvidas e dá vontade de vir: duração, preço, endereço e cancelamento sempre claros, com uma pitada sensorial concreta — *"Óleo morno, mãos firmes e uma hora só sua para soltar costas e ombros"*. Pode descrever a sensação (leveza, calor, alívio); fora continuam as abstrações vazias (energia, ritual, jornada) e a urgência de vendedor ("últimas vagas!"). Ponto de exclamação: no máximo um, só para comemorar com o cliente (*"Tudo certo, até sábado!"*).
- **Botões e mensagens.** Verbo primeiro, curto: `Agendar`, `Ver horários`, `Reagendar`, `Confirmar`, `Voltar`. Ação bloqueada diz o que fazer: `Escolha um horário`. Confirmações repetem o fato com calor: *"Sessão confirmada — 13 set · 15:00. Te espero!"*. Erros são claros, gentis e não culpam: *"Não deu para cancelar por aqui — faltam menos de 12 horas. Me chame no WhatsApp que a gente resolve."*
- **Emoji: nunca.** Nem em texto, nem em rótulos, nem em notificações; nem decoração unicode (✨, ✔). Status vai em `Badge` e em ícones Lucide.
- **Números.** `R$ 180` (espaço depois de R$), `60 minutos` na prosa e `60 min` em metadados, `15:00`, `8h às 20h`, `13 set` curto e `14 de setembro` longo.

## Marca

- **Assinatura tipográfica (principal).** "Humberto Bove" em Spectral Light itálico (estilo `wordmark`), alinhada à direita, com uma hairline em `brown-500` (ou `gold-300` sobre o marrom) e `MASSOTERAPIA` em caixa alta espaçada (26%) em `text-muted`. Negativo: tudo em `linen-0` sobre `brown-500` ou `surface-brand`, com hairline dourada. Versão reduzida a partir de 120px de largura. Ver a página **Marca**.
- **Sempre o nome inteiro.** A marca é "Humberto Bove" escrito como assinatura. Nunca use iniciais, monograma ("hb", "HB") ou só "Bove" — nem em avatar, carimbo, favicon ou faixa do cartão. Onde falta espaço, use a versão reduzida ou o nome em duas linhas ("Humberto" / "Bove").
- **Favicon e ícones de app.** "Humberto" / "Bove" em duas linhas, Spectral Light itálico `linen-0` sobre `brown-500` (marrom Bove), com traço `gold-200`. Arquivos no grupo Favicon e em `pwa/` (`favicon.ico`, `manifest.webmanifest`). Ver **Favicon & PWA**.
- Sem arquivo de marca à mão? Escreva "Humberto Bove" no estilo `wordmark`.

## Fundamentos visuais

- **A ideia.** Quente, dourado e acolhedor — luz de fim de tarde numa sala de madeira. Creme no fundo, o marrom Bove para agir e assinar, o dourado do símbolo original para dar calor e luz, sage só como respiro. Sem terracota. Serifada itálica para o que fala, sans simples para o que funciona; arcos e ondas do medalhão como desenho.
- **Cor.** A família `linen-*` (creme até marrom-café) é a base. **Marrom Bove** (`brown-500` `#855e3e`) é a cor da marca e a única cor de ação: botões, links, seleção, foco. **Gold** (`gold-*`, o dourado do símbolo original, `gold-500` `#c9973f`) é o calor: eyebrows em `text-gold`, Badge de destaque, arcos e ondas, faixas `surface-gold-soft` e o gradiente `wash-gold`; nunca botão, nunca texto em `gold-500` sobre creme. **Marrom Bove** (`surface-brand`) é a faixa escura — rodapé, chamada final, cartão. **Sage** é respiro e sucesso, nunca ação. Ocre é aviso, rust é perigo. Componentes consomem os aliases semânticos (`action-primary`, `text-body`, `surface-card`, `text-gold`), nunca um valor cru da escala. Alterne as seções: creme → `wash-gold` / `surface-gold-soft` → creme → `surface-brand` no fim.
- **Contraste.** `text-body` e `text-strong` passam de 13:1 no creme; `text-muted` 4.8:1; `text-gold` 5.4:1. `text-subtle` (2.2:1) é só decorativo. Texto sobre `action-primary` é `action-primary-fg` (4.7:1). `text-accent` (4.4:1) só em itálico grande (18px+). Sobre `gold-400` o texto é `linen-900` (7.8:1); sobre `surface-brand`, `linen-50` (5.2:1).
- **Tipo.** Spectral Light **itálico** para display e títulos de seção (`display-xl`, `display`, `title`) — é o gesto mais caloroso do sistema e ecoa a assinatura; `heading-l` fica reto para nomes de serviço. Sempre `tracking-tight`. DM Sans para corpo, rótulos, botões e números (`heading`, `body-lead`, `body`, `body-s`, `caption`, `eyebrow`). DM Mono só em especificações de token. Duas famílias de texto, nunca uma terceira. Corpo 16/1.65; leads até `measure-narrow` (46ch), prosa até `measure-prose` (64ch). Em CSS, os papéis compostos estão em `--type-display`, `--type-title`, `--type-heading`, `--type-body`, `--type-body-lead`, `--type-caption`, `--type-eyebrow` (`font: var(--type-body)`).
- **Espaço e layout.** Escala de base 4 (`space-4` … `space-128`). Container `container-max` 1180px, coluna de texto `container-text` 720px, gutters `gutter-inline` 24px / `gutter-inline-lg` 48px. Seções respiram: `section-y` 96px, compacta 56px. Controles de 34/42/52px (`control-h-*`); nada tocável abaixo de `tap-min` 44px. Layout é uma pilha vertical de seções de largura total — sem cards flutuando sobre imagem, sem composições sobrepostas. O cabeçalho é o único elemento fixo (sticky, translúcido: 86% linho + `overlay-blur`).
- **Fundos e motivos.** Creme chapado na maior parte; `wash-gold` (creme → mel) no herói e na faixa de agendamento; `wash-warm` em placeholders. Os desenhos vêm do medalhão: `.ds-wave` (uma onda dourada fina, divisor entre seções) e `.ds-arcs` (três arcos concêntricos em `gold-200` saindo de trás de uma foto ou card) — ambos decorativos, no máximo um de cada por tela. Sem texturas, sem ruído, sem clichês de spa. Imagem fica num bloco próprio com `radius-image` (24px).
- **Cards.** `surface-card` sobre o creme, `radius-card` 16px, `border-hairline` + `shadow-soft`. Para o serviço ou pacote em destaque, borda `border-gold` e `Badge tone="accent"` dourado. `tone="flat"` sem sombra, `soft` na superfície rebaixada, `sage` informativo, `inverse` quase preto para rodapés e citações. Nunca borda colorida à esquerda; nunca card dentro de card.
- **Bordas e raios.** Hairlines de 1px quentes fazem o trabalho estrutural. Tudo é macio: `radius-button` em pílula para todos os botões, `radius-control` 12px em campos e horários, `radius-card` 16px, `radius-image` 24px, `radius-sheet` 28px, `radius-pill` em badges e tags.
- **Sombras.** Três níveis em marrom quente, macios: `shadow-soft` (repouso), `shadow-lifted` (hover, dropdowns), `shadow-sheet` (modais). Internas só `shadow-inset-press` e `shadow-inset-hairline`. Sem brilho neon.
- **Transparência.** Só dois usos: o cabeçalho fixo e o scrim do dialog (`surface-overlay`, 55%). `scrim-bottom` existe para texto sobre fotografia futura.
- **Movimento.** Curto e macio: `--dur-fast` 160ms em controles, `--dur-base` 240ms em superfícies, `--ease-standard`; `--ease-out-soft` quando algo entra. Cards sobem com gosto no hover; nada quica, nada pisca. Entradas sobem 4–8px com fade; saídas são só fade. `prefers-reduced-motion` zera as durações e o lift (definidos em `components/bundle.css`).
- **Estados.** Hover escurece (`action-primary-hover` = brown-600), nunca fade de opacidade. Secondary e ghost vão para `action-secondary-hover`. Card `interactive` sobe `--lift-hover` (-2px) com `shadow-lifted`. Press escurece mais um passo e escala `--press-scale` (.985). Seleção é marrom: borda `brown-500` + `surface-accent-soft`, às vezes anel marrom de 1.5px. Foco é sempre o `focus-ring` visível (3px marrom a 35%), nunca removido. Desabilitado: `action-disabled` com `action-disabled-fg`, sem sombra.
- **Fotografia (quando chegar).** Luz natural quente, saturação baixa (`ServiceCard` aplica `saturate(.92)`): mãos, linho, madeira, plantas, a própria sala. Sem tons frios, sem preto e branco, sem clichês de spa (pedras, velas, orquídeas). Hoje não há fotografia: os kits usam um placeholder rotulado.

## Iconografia

Não há um conjunto de ícones da marca. **Substituição (sinalizada): Lucide 0.469.0**, carregado da CDN como global UMD e embrulhado pelo componente `Icon`:

```html
<script src="https://unpkg.com/lucide@0.469.0/dist/umd/lucide.js"></script>
```

```jsx
<Icon name="calendar-days" size={18} />
```

- Traço `strokeWidth` 1.75, sempre linha — nunca preenchido, duotone ou num círculo colorido.
- Ícones herdam `currentColor`; não ganham cor própria (exceção: `text-accent` em marcadores de lista soltos).
- Tamanhos: 14–16px junto a legenda/corpo, 16px dentro de controles, 20px soltos, 22–24px no `BottomNav`.
- Decorativos são `aria-hidden`; ícone com significado recebe `label`.
- **Sem emoji e sem glifos unicode como ícone.** O único unicode de pontuação é o ponto médio `·` em metadados e o travessão.
- Vocabulário dos kits: `calendar-days`, `calendar-clock`, `clock`, `map-pin`, `map`, `phone`, `message-circle`, `mail`, `instagram`, `bell`, `ticket`, `hand-heart`, `user-round`, `plus-circle`, `leaf`, `badge-check`, `graduation-cap`, `stethoscope`, `users`, `x`.

Se um conjunto próprio for adotado, troque só `Icon` — nenhum outro componente nomeia a fonte dos glifos.

## Fontes

Spectral, DM Sans e DM Mono são **substituições** servidas pelo Google Fonts (importadas no topo de `components/bundle.css`); não há arquivos de fonte de texto da marca. Portal Regular (`fonts/PortalRegular-subset.ttf`) foi extraída do favicon antigo e é um subset com só `A E M O P R S T U b e o v` — fica só como referência; não use em peças novas.

## Componentes e kits

- **Base:** `Button`, `IconButton`, `Icon`, `Badge`, `Tag`, `Card`, `SectionHeading`.
- **Formulários:** `Input`, `Textarea`, `Select`, `Checkbox`, `Radio`, `Switch`.
- **Feedback:** `Dialog`, `Toast`, `Tooltip`.
- **Navegação:** `Tabs`, `BottomNav`.
- **Marca:** `ServiceCard`, `PriceRow`, `TimeSlot`, `TestimonialQuote`.

Comece por `Button`, `Card`, `Tabs`, `ServiceCard` e pelos dois kits: **SiteKit** (site de uma página, 1280px, com agendamento interativo) e **AppKit** (o app de trabalho do Humberto, 390×844: início, agenda, clientes, financeiro, mensagens e serviços). Os fontes dos kits estão em `ui_kits/`; os fontes JSX dos componentes em `components/src/`. As direções exploradas para a assinatura ficam em `logo/opcao-*.html`; a escolhida é a assinatura itálica com o nome inteiro.

Nomes, preços, depoimentos e o endereço "Pinheiros" nos kits são **placeholders plausíveis**. Os dados reais do consultório estão no **Cartão de visita**: Rua Barão do Rio Branco, 964 — Serrana, SP · (16) 99135-8579 · @spalhum · segunda a sexta, 7h às 19h. Atendimentos: massagem relaxante, massagem modeladora, drenagem linfática, massagem terapêutica, quiropraxia, acupuntura, auriculoterapia, ventosaterapia e pedras quentes.

**Impressos para todas as idades.** Muitos clientes são idosos: em cartões e folhetos, nada de texto essencial abaixo de 15px impresso no tamanho real, lista de serviços em sentence case (não caixa alta) e contraste alto — `text-body` sobre creme, `linen-0` sobre o marrom.
