---
name: design-system
description: Identidade visual e tom de voz do Humberto Bove Massoterapia. Use antes de criar ou mudar qualquer tela, componente, cor, texto de interface ou mensagem de WhatsApp do App Beto ou da vitrine.
---

# Design system — Humberto Bove Massoterapia

Antes de mexer em interface, leia `design-system/README.md` (marca, voz, cores, tipo, regras). Depois:

1. **Cores — nunca hexadecimal solto nas telas.**
   - Admin (Tailwind): as escalas já são as da marca, definidas em `src/app/globals.css`:
     `violet-*` = marrom Bove (ação, `violet-600` = `#855e3e`), `gray-*` = creme/café (neutros),
     `amber-*` = dourado (destaques, eyebrows `amber-700`), `green-*` = sálvia (sucesso),
     `red-*` = ferrugem (erro), `blue-*` = bege (status neutro). Use essas classes.
   - Vitrine: variáveis de `src/app/vitrine/bove-ds.css` (`--action-primary`, `--text-body`…).
   - Valores de referência: `design-system/tokens.json` / `tokens.css`.
2. **Tipo:** títulos de tela com a classe `font-display` (Spectral itálico); resto em DM Sans (padrão).
3. **Forma:** botões em pílula (`rounded-full`), alvo de toque ≥ 44 px (`min-h-11`), cards `rounded-xl` com `border-gray-200`. Nunca borda colorida só de um lado.
4. **Marca:** sempre o nome inteiro "Humberto Bove". Nada de iniciais, monograma "hb" ou "Bove" sozinho. Sem terracota, sem violeta/roxo.
5. **Texto:** português do Brasil, voz do Beto (eu/você), calorosa e concreta. **Sem emoji** em interface e em mensagens. No máximo uma exclamação, só para comemorar.
6. **Telas do celular:** o layout-alvo está em `design-system/app-kit/` (React de referência, não é código de produção — leia `app-kit/README.md`). Siga a estrutura: Início com próximo atendimento em destaque, agenda em linha do tempo com ações por toque, ações em folhas que sobem de baixo, barra inferior Início · Agenda · Clientes · Financeiro · Mais.
7. Se uma mudança no código criar um padrão novo (cor, componente, regra), registre em `design-system/CHANGELOG.md` para ser levado de volta ao design system publicado.
