# Passagem do projeto — App Beto

Documento para quem mantém o app a partir de outubro de 2026. Reúne o que não dá para descobrir só lendo o código: serviços externos, configuração, como as peças funcionam e o que ainda depende de ação fora do código.

## O que é

Um único app Next.js com duas partes no mesmo domínio:

| Parte | Rotas | Quem usa | Acesso |
|---|---|---|---|
| **Admin** ("App Beto") | `/`, `/agenda`, `/clientes`, `/financeiro`, `/mensagens`, `/servicos`, `/conteudo-vitrine` | Só o Beto, para gerenciar agenda, clientes e cobranças | Senha única (`APP_PASSWORD`) |
| **Vitrine** (Humberto Bove Massoterapeuta) | `/vitrine`, `/vitrine/agendar` | Clientes, para conhecer o trabalho e reservar online | Pública |

Cada parte é instalável no celular como um app (PWA) separado. Os manifests são `public/manifest.json` (admin) e `public/vitrine/manifest.webmanifest` (vitrine), cada um com `scope` próprio. Sem o `scope` explícito, o celular trata os dois como o mesmo app.

**Stack:** Next.js 16 (App Router, Turbopack), React 19, Prisma 7 com PostgreSQL (Supabase), Tailwind 4 no admin, CSS com tokens próprios na vitrine (`src/app/vitrine/bove-ds.css` + `src/components/vitrine/ds/`). WhatsApp pela Evolution API no Render. Visual segue o design system em `design-system/` (skill `design-system`).

> **Atenção:** o Next.js 16 tem mudanças incompatíveis com versões anteriores. Antes de mexer em rotas, metadata ou middleware, consulte a documentação instalada em `node_modules/next/dist/docs/` (ver `AGENTS.md`). Exemplo: o middleware deste projeto se chama `src/proxy.ts`, não `middleware.ts`.

## Rodar localmente

1. **Node 22.12 ou mais novo** (o Prisma 7 recusa versões anteriores; está em `engines` no `package.json`).
2. `npm install` (roda `prisma generate` automaticamente).
3. Crie o `.env` na raiz com as variáveis da tabela abaixo. Os valores **não estão no repositório** e devem ser passados por um canal privado, nunca por commit ou chat.
4. `npm run dev` e abra `http://localhost:3000`.
5. Antes de commitar: `npm run typecheck` e `npm run lint` (os dois estão zerados hoje), e `npm run build` em mudanças maiores.

> O ambiente local usa o **mesmo banco de produção**. Teste com dados temporários e apague depois. Atendimentos criados pelo app também vão para o Google Agenda do Beto.

## Variáveis de ambiente

| Variável | Para que serve | De onde vem |
|---|---|---|
| `DATABASE_URL` | Conexão do Prisma com o banco | Supabase → Connect → **Transaction pooler** (porta 6543). Caracteres especiais da senha precisam de *percent-encoding* (`#` → `%23`, `@` → `%40`) |
| `APP_PASSWORD` | Senha de login do admin | Você escolhe |
| `CRON_SECRET` | Autenticação dos crons da Vercel | Você escolhe; a Vercel envia no cabeçalho `Authorization` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth do Google (Calendar e Contatos) | Google Cloud Console → Credenciais → cliente OAuth |
| `GOOGLE_REFRESH_TOKEN` | Acesso contínuo ao Google Calendar | Gerado pelo próprio app em `/api/calendar/auth` (logado): depois de autorizar, a página mostra o valor para copiar. Se a sincronização mostrar "Reconectar Google", é aqui |
| `GOOGLE_CALENDAR_ID` | Qual agenda sincronizar | Google Calendar → configurações da agenda |
| `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` | Envio de mensagens por WhatsApp | Servidor Evolution no Render (`render.yaml`); passo a passo em `docs/whatsapp-render.md` |
| `MERCADOPAGO_ACCESS_TOKEN` | Geração de cobranças Pix | Mercado Pago → Suas integrações → credenciais de produção |
| `SUPABASE_URL` | Fotos da vitrine (Storage) e liberação delas no `next/image` (`next.config.ts`). Precisa estar também no build da Vercel | Supabase → Project Settings → API → *Project URL* |
| `SUPABASE_SERVICE_ROLE_KEY` | Envio das fotos ao bucket `vitrine`. **Segredo**: só o servidor usa | Supabase → Project Settings → API → *service_role* |
| `RENDER_API_KEY` | **Só local**, para administrar o serviço do Render por script. Não vai para a Vercel | Render → Account Settings → API Keys |

`NEXTAUTH_SECRET` e `NEXTAUTH_URL` podem aparecer em `.env` antigos: **não são usadas** e podem ser apagadas.

## Serviços externos

| Serviço | Situação |
|---|---|
| **GitHub** | `luizhumbertobove-ops/App-agenda`. Cada push no `main` publica na Vercel |
| **Vercel** | Projeto `appbeto-puce.vercel.app`, região das funções **Oregon (`pdx1`)**, a mesma do banco. Variáveis em *Settings → Environment Variables*; os crons vêm do `vercel.json` |
| **Supabase** | Banco Postgres (us-west-2) e Storage (bucket público `vitrine`) |
| **Render** | Serviço `evolution-beto` (WhatsApp). Sessão guardada no próprio Supabase, schema `evolution` |
| **Google Cloud** | Cliente OAuth com o *redirect URI* `https://appbeto-puce.vercel.app/api/contacts/callback` |
| **Mercado Pago** | Token da conta que recebe os pagamentos; o webhook é enviado em cada cobrança |

### Se o endereço do site mudar

1. **`src/lib/site-url.ts`**: a constante `PRODUCTION_ORIGIN` (usada no lugar da URL de cada deploy, porque URLs de preview não estão cadastradas no Google nem alcançáveis pelo Mercado Pago).
2. **Google Cloud Console → cliente OAuth → URIs de redirecionamento**: `https://<novo-dominio>/api/contacts/callback`.
3. **Mercado Pago**: nada a fazer, o webhook usa `PRODUCTION_ORIGIN`.

## Como as peças funcionam

- **Login:** `src/proxy.ts` deixa passar as rotas de `PUBLIC_PATHS` e exige o cookie de sessão nas outras. A sessão é derivada de `APP_PASSWORD` (`src/lib/auth.ts`). Comparações de segredo em tempo constante; o login limita tentativas erradas por IP.
- **Crons** (`vercel.json`; a Vercel usa UTC, abaixo em horário de Brasília). Só aceitam `Authorization: Bearer CRON_SECRET`:
  - `/api/calendar/sync` às 8h: sincroniza com o Google Agenda (hoje até 60 dias; eventos apagados no Google cancelam o atendimento no app).
  - `/api/cron/reengagement` às 9h: mensagem de saudade para clientes sumidos.
  - `/api/cron/confirmations` às 18h: confirmações dos atendimentos do dia seguinte (ou de N dias, conforme a tela Mensagens).
- **Agenda:** visões Dia e Semana (grade de hora em hora; no celular cabe a semana inteira). Tocar num atendimento abre as ações (confirmar, concluir, faltou, editar, cancelar, reabrir). Sessões de 1 a 10 horas seguidas, sempre começando em hora cheia. Jornada de trabalho por dia em **Agenda › Jornada** (`Settings.workSchedule`, `src/lib/work-schedule.ts`), que também define o que a vitrine oferece. Bloqueios mostram o motivo e são editáveis tocando neles.
- **Concluir e Financeiro:** concluir pede o pagamento (pelo pacote, já recebi, a receber ou não cobrar) e lança no Financeiro; "Reabrir" desfaz e restaura a cobrança como estava (`Payment.preCompletionStatus/Amount`). Cancelar ou "Faltou" cancela a cobrança em aberto (status `CANCELLED`: sai dos totais e das listas, fica no banco). Totais por mês usam o horário de Brasília (`monthRangeBR` em `src/lib/date.ts`).
- **Pacotes:** vendidos na ficha do cliente (`Plan` + `PlanSubscription`); o valor entra uma vez no Financeiro e cada sessão concluída "pelo pacote" desconta do saldo.
- **Parceria:** atendimento de cliente de outra massoterapeuta (`Appointment.isPartner`), sem cadastro de cliente; valor sugerido pela metade.
- **Clientes:** reconhecidos pelo WhatsApp, guardado só com dígitos e com 55. Atendimentos vindos do Google sem cadastro podem ser ligados a um cliente em "Editar atendimento".
- **WhatsApp:** modelos editáveis e com liga/desliga em **Mensagens** (tabela `Settings`; padrões em `src/lib/evolution.ts`). Antes de enviar, o app confere se a Evolution está no ar; se não estiver, os envios viram uma lista para mandar pelo celular (link `wa.me`), e Início/Mensagens mostram o botão **Reconectar WhatsApp** (QR code ou código de 8 letras no próprio celular).
- **Vitrine:** reservas online com limites (até 60 dias à frente, 2 por telefone a cada 24h, 10 por hora no total, campo-isca contra robôs, trava contra dupla reserva). Lembra nome e telefone no aparelho do cliente. Textos e fotos editáveis em **Vitrine** (`/conteudo-vitrine`; tabela `VitrineContent`, padrões em `src/lib/vitrine-content.ts`, fotos no bucket `vitrine`).
- **Componentes compartilhados do admin:** `src/components/` (`Modal`, `Button`, `Input`, `StatusBadge`, `ClientCombobox`, `PageSkeleton`...); `src/lib/format.ts` (`formatCurrencyBR`).

## Banco de dados

Schema em `prisma/schema.prisma`. As mudanças de banco são **arquivos SQL manuais** em `prisma/migrations/`, aplicados no Supabase SQL Editor. Não rode `prisma migrate reset` nem `prisma db push` contra produção.

- **Banco novo do zero:** rode só `manual_00_baseline.sql` (gerado do schema atual).
- **Histórico aplicado em produção**, nesta ordem: `20260608234002_init`, `manual_add_mp_payment_id`, `manual_add_settings`, `manual_payment_client_optional`, `manual_phase2_roadmap`, `manual_vitrine_content`, `manual_plano_beto`, `manual_planos_parceria`, `manual_mensagens_ativas`, `manual_cobranca_cancelada`.
- Ao mudar o schema: crie um `manual_<assunto>.sql` só com o que mudou (use `IF NOT EXISTS`), aplique em produção, rode `npx prisma generate` e regenere o baseline com `npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script`.

## Pendências (dependem de ação fora do código)

1. **Trocar os segredos** que passaram por mais de uma pessoa: senha do banco (atualizar `DATABASE_URL` na Vercel e no `.env`), `APP_PASSWORD` (todos saem e entram de novo), `CRON_SECRET` e, se possível, o token do Mercado Pago.
2. **Webhook do Mercado Pago:** cadastrar o segredo de assinatura no painel do MP e criar a variável `MP_WEBHOOK_SECRET`; com ela dá para verificar a assinatura `x-signature` em `/api/payments/webhook` (hoje o webhook confere o pagamento direto no MP e o valor pago, mas não a assinatura).
3. **Render no plano pago** para uso diário do WhatsApp (o grátis "dorme" e demora até um minuto para acordar).
4. **Desligar a máquina antiga da Evolution** no Google Cloud (`34.74.115.57`), se ainda existir.
5. **Opcional — sessão que expira:** hoje o login vale até trocar o `APP_PASSWORD`. Para expirar e permitir "sair de todos os aparelhos", criar `SESSION_SECRET` e mudar `src/lib/auth.ts` para tokens com data (derruba todos os logins uma vez).
6. **Ícones "maskable" do PWA:** os do design não tinham margem de segurança e cortariam o logo no Android; o manifest usa só os ícones normais.
