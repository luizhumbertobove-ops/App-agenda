# Mudanças a levar para o design system publicado

Anote aqui (data, o quê, onde no código) qualquer padrão visual ou de texto criado no app que ainda não está no design system. Na próxima sessão de design, isto é aplicado no artefato e a pasta `design-system/` é atualizada.

- 2026-10-12 — Pasta criada a partir do artefato "Humberto Bove Massoterapia" (versão com marrom Bove, sem terracota).
- 2026-10-15 — A assinatura passa a usar `MASSOTERAPEUTA` no lugar de `MASSOTERAPIA` (pedido do Beto: indicar a profissão). Vale para a linha abaixo do nome no menu do app (`src/components/sidebar.tsx`), na vitrine (conteúdo `nomeEspaco`) e nos títulos/rodapé. "Massoterapia" continua quando o texto fala do serviço (ex.: "sessão de massoterapia").
- 2026-10-15 — Vitrine: dialog de detalhes do serviço (`src/components/vitrine/service-list.tsx`). Folha que sobe de baixo no celular e centralizada no PC, scrim `surface-overlay`, `radius-sheet`, `shadow-sheet`; eyebrow "Serviço", título Spectral, seções "O que é" e "Como é a sessão" com eyebrow, botão primário "Agendar este serviço".
- 2026-10-15 — App, Agenda › Semana: grade de hora em hora; o status do atendimento aparece como ponto de cor (agendado bege, confirmado sálvia, concluído dourado), não como borda lateral.
- 2026-10-16 — App, Agenda › Semana no celular: a semana inteira cabe na tela; status do cartão vira cor de fundo (bege/sálvia/dourado) e o nome usa até 2 linhas com hifenização; no PC continua o ponto de cor. Bloqueio aparece como cartão cinza com cadeado e o motivo.
- 2026-10-16 — App: chave "Atendimento em parceria" (switch em cartão branco com título e descrição), acima do campo Cliente (`src/components/partner-toggle.tsx`).
- 2026-10-16 — App: folha "Vender pacote" na ficha do cliente e barra de progresso de sessões do pacote (`sell-plan-modal.tsx`).
- 2026-10-19 — App: folha "Editar bloqueio" com excluir em confirmação vermelha (`blocked-slot-chip.tsx`).
- 2026-10-19 — App: folha "Conectar WhatsApp" com abas em pílula (Código no celular / QR code) e código de 8 letras em fonte mono com botão Copiar (`whatsapp-connect.tsx`); aviso âmbar "WhatsApp desconectado" no Início.
- 2026-10-19 — App, Mensagens: liga/desliga por modelo (switch com texto do efeito quando desativado).
- 2026-10-19 — App: tela de carregamento por seção (`PageSkeleton`: título real + blocos neutros pulsando, sem pulso com "reduzir movimento").
- 2026-10-19 — Status de cobrança "Cancelada" (cinza), só no histórico.
- 2026-10-22 — Vitrine, Galeria: carrossel horizontal (`src/components/vitrine/carrossel.tsx`) com scroll-snap, setas redondas e pontinhos; um item por página, sem autoplay. Mostra um pedaço do próximo item (1.15 / 2.2 / 3.2 por tela).
- 2026-10-22 — Vitrine, Galeria: lightbox em `<dialog>` nativo (`src/components/vitrine/lightbox.tsx`): fundo `surface-overlay`, foto `object-contain`, fechar, anterior e próxima, contador "3 de 8", entrada com fade e escala .98→1; foco volta para a foto.
- 2026-10-22 — Vitrine, Avaliações: seção nova (`src/components/vitrine/avaliacao-card.tsx`) com média em uma casa decimal, resumo e cartões em carrossel. Exceção à regra de ícones só em linha: as estrelas da nota são preenchidas (`fill=currentColor`, cor `text-accent`; vazias em `border-default`), porque a convenção de nota é estrela cheia. Cartão: `surface-page`, `radius-card`, texto em 6 linhas com "Ler mais" só quando corta.
