# Mudanças a levar para o design system publicado

Anote aqui (data, o quê, onde no código) qualquer padrão visual ou de texto criado no app que ainda não está no design system. Na próxima sessão de design, isto é aplicado no artefato e a pasta `design-system/` é atualizada.

- 2026-10-12 — Pasta criada a partir do artefato "Humberto Bove Massoterapia" (versão com marrom Bove, sem terracota).
- 2026-10-15 — A assinatura passa a usar `MASSOTERAPEUTA` no lugar de `MASSOTERAPIA` (pedido do Beto: indicar a profissão). Vale para a linha abaixo do nome no menu do app (`src/components/sidebar.tsx`), na vitrine (conteúdo `nomeEspaco`) e nos títulos/rodapé. "Massoterapia" continua quando o texto fala do serviço (ex.: "sessão de massoterapia").
- 2026-10-15 — Vitrine: dialog de detalhes do serviço (`src/components/vitrine/service-list.tsx`). Folha que sobe de baixo no celular e centralizada no PC, scrim `surface-overlay`, `radius-sheet`, `shadow-sheet`; eyebrow "Serviço", título Spectral, seções "O que é" e "Como é a sessão" com eyebrow, botão primário "Agendar este serviço".
- 2026-10-15 — App, Agenda › Semana: grade de hora em hora; o status do atendimento aparece como ponto de cor (agendado bege, confirmado sálvia, concluído dourado), não como borda lateral.
