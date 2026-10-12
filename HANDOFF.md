# Passagem do projeto — App Beto

Documento para quem assume o desenvolvimento a partir de outubro de 2026. Reúne o que não dá para descobrir só lendo o código: serviços externos, configuração, pendências e decisões em andamento.

## O que é

Um único app Next.js com duas partes no mesmo domínio:

| Parte | Rotas | Quem usa | Acesso |
|---|---|---|---|
| **Admin** ("App Beto") | `/`, `/agenda`, `/clientes`, `/financeiro`, `/mensagens`, `/servicos` | Só o Beto, para gerenciar agenda, clientes e cobranças | Senha única (`APP_PASSWORD`) |
| **Vitrine** (Bove Massoterapia) | `/vitrine`, `/vitrine/agendar` | Clientes, para conhecer o trabalho e agendar online | Pública |

Cada parte é instalável no celular como um app (PWA) separado: ícone roxo para o admin, marrom para a vitrine. Os manifests são `public/manifest.json` (admin) e `public/vitrine/manifest.webmanifest` (vitrine), cada um com `scope` próprio. Sem o `scope` explícito, o celular trata os dois como o mesmo app.

**Stack:** Next.js 16 (App Router, Turbopack), React 19, Prisma 7 com PostgreSQL (Supabase), Tailwind 4 no admin, CSS com tokens próprios na vitrine (`src/app/vitrine/bove-ds.css` + `src/components/vitrine/ds/`).

> **Atenção:** o Next.js 16 tem mudanças incompatíveis com versões anteriores. Antes de mexer em rotas, metadata ou middleware, consulte a documentação que vem instalada em `node_modules/next/dist/docs/` (ver `AGENTS.md`). Exemplo: o middleware deste projeto se chama `src/proxy.ts`, não `middleware.ts`.

## Rodar localmente

1. **Node 22.12 ou mais novo** (o Prisma 7 recusa versões anteriores).
2. `npm install` (roda `prisma generate` automaticamente).
3. Crie o `.env` na raiz com as variáveis da tabela abaixo. Os valores **não estão no repositório** e devem ser passados por um canal privado, nunca por commit ou chat.
4. `npm run dev` e abra `http://localhost:3000`.
5. Antes de commitar: `npx tsc --noEmit` e `npx eslint .` (os dois estão zerados hoje).

## Variáveis de ambiente

| Variável | Para que serve | De onde vem |
|---|---|---|
| `DATABASE_URL` | Conexão do Prisma com o banco | Supabase → Connect → **Transaction pooler** (porta 6543). Caracteres especiais da senha precisam de *percent-encoding* (`#` → `%23`, `@` → `%40`). A conexão direta (`db.<projeto>.supabase.co`) só funciona em rede com IPv6 |
| `APP_PASSWORD` | Senha de login do admin | Você escolhe |
| `CRON_SECRET` | Autenticação dos crons da Vercel | Você escolhe; a Vercel envia no cabeçalho `Authorization` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth do Google (Calendar e Contatos) | Google Cloud Console → Credenciais → cliente OAuth |
| `GOOGLE_REFRESH_TOKEN` | Acesso contínuo ao Google Calendar | Gerado pelo próprio app em `/api/calendar/auth`: depois de autorizar, a página mostra o valor para copiar |
| `GOOGLE_CALENDAR_ID` | Qual agenda sincronizar | Google Calendar → configurações da agenda |
| `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`, `EVOLUTION_INSTANCE` | Envio de mensagens por WhatsApp | Servidor Evolution API (auto-hospedado) e a instância ligada ao número do WhatsApp |
| `MERCADOPAGO_ACCESS_TOKEN` | Geração de cobranças Pix | Mercado Pago → Suas integrações → credenciais de produção |

`NEXTAUTH_SECRET` e `NEXTAUTH_URL` aparecem no `.env` antigo, mas **não são usadas** pelo código (o pacote `next-auth` está instalado sem uso).

## Serviços externos e o que muda na transferência

Hoje tudo está nas contas do Leonardo. Para o projeto ficar 100% seu:

| Serviço | O que fazer |
|---|---|
| **GitHub** | Repositório transferido para `luizhumbertobove-ops/App-agenda` |
| **Vercel** | Criar um projeto novo ligado ao seu repositório (ou receber a transferência do projeto atual). Cadastrar todas as variáveis da tabela em *Settings → Environment Variables*. Os crons vêm do `vercel.json` automaticamente |
| **Supabase** | Receber a transferência do projeto atual (Supabase → *Project Settings → General → Transfer project*) para não perder os dados. Depois, **resetar a senha do banco** e atualizar `DATABASE_URL` |
| **Google Cloud** | Criar um cliente OAuth na sua conta (ou receber acesso ao projeto atual), cadastrar o *redirect URI* (ver abaixo) e gerar um `GOOGLE_REFRESH_TOKEN` novo em `/api/calendar/auth` |
| **Mercado Pago** | Usar o token da conta que vai receber os pagamentos |
| **Evolution API** | Confirmar onde o servidor roda e se a instância está ligada ao WhatsApp certo |

Depois de tudo transferido, **troque todos os segredos**: senha do banco, `APP_PASSWORD`, `CRON_SECRET` e, se possível, o token do Mercado Pago. Os valores atuais passaram por mais de uma pessoa.

### Se o endereço do site mudar

O domínio de produção atual é `https://appbeto-puce.vercel.app`. Se ele mudar (projeto novo na Vercel ou domínio próprio), atualize três lugares:

1. **`src/lib/site-url.ts`**: a constante `PRODUCTION_ORIGIN`. Ela é usada de propósito no lugar da URL de cada deploy, porque URLs de preview não estão cadastradas no Google nem alcançáveis pelo Mercado Pago.
2. **Google Cloud Console → cliente OAuth → URIs de redirecionamento autorizados**: `https://<novo-dominio>/api/contacts/callback` (o mesmo URI serve para Contatos e para reconectar o Calendar).
3. **Mercado Pago**: nada a fazer, o webhook (`/api/payments/webhook`) é enviado em cada cobrança usando `PRODUCTION_ORIGIN`.

## Como as peças funcionam

- **Login do admin:** `src/proxy.ts` deixa passar as rotas da lista `PUBLIC_PATHS` e exige o cookie de sessão nas outras. A sessão é derivada de `APP_PASSWORD` (`src/lib/auth.ts`).
- **Crons** (`vercel.json`, horários em UTC):
  - `/api/cron/confirmations`, todo dia às 21h: envia as confirmações de atendimento por WhatsApp
  - `/api/cron/reengagement`, todo dia às 12h: envia mensagens para clientes inativos
  - `/api/calendar/sync`, todo dia às 11h: sincroniza com o Google Calendar
- **Banco:** schema em `prisma/schema.prisma`. As migrações em `prisma/migrations/` são arquivos SQL manuais (`manual_*.sql`), aplicados direto no banco. Não rode `prisma migrate reset` nem `prisma db push` contra produção sem backup.
- **Mensagens:** os modelos de texto do WhatsApp são editáveis pela tela Mensagens (tabela `Settings`); os padrões estão em `src/lib/evolution.ts`.
- **Componentes compartilhados do admin:** `src/components/` tem `Modal`, `Button`, `Input`, `PageHeader`, `EmptyState`, `StatusBadge` e `ClientCombobox`; `src/lib/format.ts` tem `formatCurrencyBR`. Use-os em vez de repetir classes do Tailwind.

## Pendências e riscos conhecidos

Em ordem de prioridade:

1. **`/api/calendar/sync` está pública e sem autenticação.** Ela está em `PUBLIC_PATHS` (para o cron) mas, ao contrário dos outros crons, não confere o `CRON_SECRET`. Qualquer pessoa com o endereço consegue disparar a sincronização, que grava no banco. Correção: exigir o cabeçalho `Authorization: Bearer ${CRON_SECRET}` como em `src/app/api/cron/confirmations/route.ts`. O botão "Sincronizar agenda" do admin vai precisar chamar outra rota protegida pelo login, ou passar pelo proxy.
2. **Dependências com vulnerabilidades conhecidas** (varredura de 14/09/2026): `next` 16.2.7 → 16.2.11 ou mais novo; `next-auth`, `axios`, `postcss`, `sharp`, `hono` e outros com correções disponíveis. Atualize um pacote por vez, rodando build e testes a cada um. O `next-auth` pode simplesmente ser removido, porque não é usado.
3. **Comparação da sessão em tempo não constante:** `src/proxy.ts` compara o token com `===`. Risco baixo, mas o ideal é uma comparação de tempo constante.
4. **Bug de hidratação na inicial do avatar:** em `/clientes` e no detalhe do cliente, `client.name.charAt(0)` corta ao meio nomes que começam com emoji (ex.: "🌸 Dra Monica"). Use `Array.from(name)[0]`.
5. **A lista de clientes carrega todos os 532 de uma vez** (~3 s no servidor de desenvolvimento). Precisa de paginação ou carregamento sob demanda.
6. **Ícones "maskable" do PWA:** os que vieram no design não tinham margem de segurança e cortariam o logo no Android. Ficaram de fora; o manifest usa só os ícones normais.
7. O `README.md` ainda é o padrão do `create-next-app`.

## Redesign do admin (em andamento)

Decidido em outubro de 2026: o admin vai ser redesenhado com **layouts próprios para celular e PC**, cada um com uma **navegação completamente diferente**, e **paleta nova** (sem o violeta saturado, a fonte Inter e os ícones Lucide atuais).

**Prioridades de uso (do próprio Beto):** a versão principal é o **celular**; as tarefas diárias são **ver a agenda do dia** e **marcar/remarcar horário**.

**O que a auditoria de 11/10/2026 encontrou:**
- No celular, a barra lateral fixa ocupa 16% da largura da tela, e quase todos os botões têm menos de 44 px, o mínimo recomendado para toque.
- No PC, o conteúdo usa só ~60% da largura, e a agenda da semana empilha os 7 dias em vez de mostrar uma grade.
- Ações destrutivas ("Limpar agenda", "Excluir") têm o mesmo destaque das ações comuns.
- Cada atendimento mostra 4 botões de status ao mesmo tempo. O ideal é mostrar só a ação que faz sentido no momento.
- O Dashboard destaca "Sincronizar agenda" (ação rara) e não tem "Novo agendamento" (ação mais usada).

**Direção proposta:**
- **Celular:** barra inferior (Hoje · Agenda · + · Clientes · Mais), agendamento em folha que sobe de baixo, gestos para confirmar ou concluir.
- **PC:** barra lateral neutra e recolhível com busca rápida (Ctrl+K), agenda semanal em grade de 7 colunas, clientes em lista com o detalhe ao lado.

**Próximo passo:** gerar os mockups antes de mexer no código. O pedido completo, pronto para colar no `/design` do Claude Code, está no fim deste documento.

### Pedido de mockups

```
Redesign do "App Beto": app interno de gestão de um massoterapeuta (agenda e clientes), usado só pelo dono. Versão principal: CELULAR. Uso diário: ver a agenda do dia e marcar/remarcar horário.

Identidade: paleta nova, SEM violeta/roxo saturado, sem cara de "app de IA". Tons sóbrios e calmos (contexto de bem-estar), uma única cor de destaque, cinzas da mesma família. Fonte com personalidade (não Inter). Status de atendimento com no máximo 3 cores. Alvos de toque ≥ 44px. Textos em português do Brasil.

Artboards CELULAR (390x844), navegação inferior: Hoje · Agenda · [+] central · Clientes · Mais
1. Hoje: próximos atendimentos do dia em linha do tempo compacta (sem as 14 linhas de "Livre"), próximo cliente em destaque, atalho para remarcar. Dia vazio = convite "agendar agora".
2. Novo agendamento em bottom sheet: cliente (busca), serviço, dia em faixa de datas deslizável, horários livres em chips; poucos passos.
3. Remarcar: a partir do atendimento, escolher novo dia/horário no mesmo bottom sheet.
4. Ações do atendimento: só a ação certa para o momento (antes: Confirmar; depois: Concluiu/Faltou), por deslizar ou toque longo; Cancelar fica escondido.
5. Mais: Financeiro, Mensagens, Serviços, Sair.

Artboards PC (1440x900), sidebar completamente diferente da do celular: estreita/recolhível, tom neutro, com busca rápida de clientes (Ctrl+K) e resumo de "hoje".
6. Agenda semanal em grade de 7 colunas por horário, hoje destacado, arrastar para remarcar.
7. Clientes em lista + detalhe lado a lado (sem trocar de página); ação "Excluir" discreta, separada das comuns.
```
