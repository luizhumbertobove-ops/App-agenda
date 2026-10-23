# Avaliações do Google na vitrine

Perfil do Beto no Google Maps: **Espaço Lhum — Serrana, SP** (5,0 · 72 avaliações em out/2026).
Feature id do lugar: `0x94b9db9c5ead0089:0xa678490e7ef95068`.

## Como funciona hoje

1. **Scraper diário** (`scripts/avaliacoes/scrape.mjs`) roda no GitHub Action `.github/workflows/avaliacoes-google.yml` (7h de Brasília, ou manual em Actions → "Avaliações do Google (diário)" → Run workflow).
   Abre o perfil com Playwright, lê as avaliações e manda para `POST /api/avaliacoes/importar` (protegido pelo `CRON_SECRET`).
2. As novas entram como **pendentes**. O Beto aprova ou oculta em **Admin → Avaliações**. As do Google não se apagam (o scraper traria de volta): ocultam-se.
3. **Cadastro manual**: botão "Adicionar avaliação" na mesma tela. Entra já aprovada.
4. A vitrine mostra as **10 melhores aprovadas** (maior nota, depois mais recentes), com média e total de todas as aprovadas. O botão "Ver todas no Google" usa o campo "Link das avaliações no Google Maps" em Admin → Vitrine.

### Configuração do Action (GitHub → Settings → Secrets and variables → Actions)

| Tipo | Nome | Valor |
|---|---|---|
| Variable | `GOOGLE_MAPS_URL` | `https://www.google.com/maps/search/?api=1&query=Spa%C3%A7o+Lhum+Serrana+SP` |
| Variable | `APP_URL` | URL do app em produção (sem barra no fim) |
| Secret | `CRON_SECRET` | o mesmo `CRON_SECRET` da Vercel |

## Limites do scraper (testado em 22/10/2026)

- **Sem login, o Google mostra só 5 avaliações** (as "mais relevantes"). "Ver mais avaliações" pede login.
- **Não dá para ordenar por mais recentes** sem login: uma avaliação nova pode não aparecer entre as 5.
- **Endpoint interno do Maps** (`/maps/rpc/listugcposts`, que pagina e ordena) responde **403** sem login em todas as variações testadas. Tentativa descartada.
- Seletores ficam na constante `SELETORES` no topo do script: se o Google mudar a página e o Action falhar, é ali que se ajusta (o Action guarda um print `scrape-falhou.png` como artifact).

## Caminhos para trazer as 72 (e as novas)

1. **API do Perfil da Empresa (Google Business Profile) — recomendado.**
   Oficial e gratuita. Endpoint `accounts.locations.reviews.list`: traz todas as avaliações, com data exata, paginado; também permite responder avaliações.
   Passos: (a) pedir acesso à API no formulário do Google Business Profile APIs (projeto do Google Cloud que já usamos na Agenda; leva alguns dias); (b) ativar "My Business Account Management API" e "My Business Business Information API"; (c) o Beto autoriza uma vez com a conta dona do perfil (escopo `https://www.googleapis.com/auth/business.manage`), no mesmo fluxo OAuth da Agenda/Contatos; (d) trocar o Action por um cron na Vercel que chama a API e grava em `GoogleReview` com o mesmo `externalId` (`reviewId`), mantendo a aprovação.
2. **Ficar com as 5 + manual.** O scraper mantém as 5 em destaque atualizadas e o Beto copia no modal as que quiser mostrar. Para uma vitrine de 10, resolve.
3. Descartados: scraper logado com a conta do Beto (risco de bloqueio da conta), serviços pagos de scraping (Outscraper, SerpApi — custo mensal), Places API (também limitada a 5).
