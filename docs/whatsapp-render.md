# WhatsApp no Render (Evolution API)

O app envia as mensagens de WhatsApp (confirmações, Pix, saudade, aviso de novo agendamento) por uma **Evolution API**. Ela precisa ficar ligada o tempo todo, conectada ao número do Beto. Por isso roda no **Render**, e não na Vercel: a Vercel desliga o código entre uma requisição e outra, e a conexão com o WhatsApp cairia.

A configuração já está pronta no repositório, em [`render.yaml`](../render.yaml). Abaixo, o que falta fazer.

> Enquanto a Evolution estiver fora do ar, o app não trava: a tela **Mensagens** mostra um aviso e os envios viram uma lista para mandar pelo WhatsApp do celular, com a mensagem pronta.

## Antes de começar

- Uma conta no **Render** (render.com), de quem vai pagar o serviço.
- Acesso ao **Supabase** do app (para pegar o endereço do banco).
- Acesso à **Vercel** do app (para trocar três variáveis).
- O **celular do número que envia as mensagens**, na hora de conectar (passo 5).

## 1. Endereço do banco (Supabase)

A Evolution guarda a sessão do WhatsApp no Postgres. Assim, se o Render reiniciar, o número continua conectado. Ela usa um schema próprio (`evolution`), separado das tabelas do app.

1. No Supabase do app, clique em **Connect** (topo da página).
2. Escolha **Session pooler** (porta **5432**). Não use o *Transaction pooler* (porta 6543): a Evolution cria as próprias tabelas ao iniciar e isso não funciona nele.
3. Copie o endereço, troque `[YOUR-PASSWORD]` pela senha do banco e acrescente `?schema=evolution` no final. Fica assim:

   ```
   postgresql://postgres.xxxx:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres?schema=evolution
   ```

Guarde esse endereço para o passo 2. Ele contém a senha do banco: não mande por mensagem nem cole em lugar público.

## 2. Criar o serviço no Render

1. No Render: **New › Blueprint**.
2. Conecte o GitHub e escolha o repositório **luizhumbertobove-ops/App-agenda**. O Render encontra o `render.yaml` sozinho e mostra o serviço **evolution-beto**.
3. Preencha as duas variáveis que ele pede:
   - **`SERVER_URL`**: `https://evolution-beto.onrender.com` (se o Render mostrar outro endereço para o serviço, use o dele).
   - **`DATABASE_CONNECTION_URI`**: o endereço do passo 1.
4. Confirme o plano **Starter** (pago). O plano grátis "dorme" depois de alguns minutos sem uso e derruba a conexão com o WhatsApp.
5. Clique em **Apply** e espere o deploy terminar (alguns minutos).

**Para conferir:** abra `https://evolution-beto.onrender.com` no navegador. Deve aparecer uma mensagem de boas-vindas da Evolution, em JSON.

## 3. Copiar a chave da Evolution

No Render, abra o serviço **evolution-beto › Environment** e copie o valor de **`AUTHENTICATION_API_KEY`**. O Render gerou essa chave sozinho; é ela que o app usa para falar com a Evolution.

## 4. Apontar o app para o Render (Vercel)

Na Vercel, em **Settings › Environment Variables** do projeto, ajuste as três variáveis (em Production):

| Variável | Valor |
|---|---|
| `EVOLUTION_API_URL` | `https://evolution-beto.onrender.com` |
| `EVOLUTION_API_KEY` | a chave do passo 3 |
| `EVOLUTION_INSTANCE` | `beto` |

Depois, em **Deployments**, faça **Redeploy** do último deploy, para o app passar a usar os valores novos.

Atualize também o `.env` local com os mesmos três valores, se for rodar o app no computador.

## 5. Conectar o número (QR code)

1. No app, entre em **Mais › Mensagens**. O aviso "envio automático fora do ar" aparece com o botão **Conectar WhatsApp**.
2. Toque no botão: aparece um QR code. Ele se renova sozinho a cada 30 segundos.
3. No **celular do número que envia as mensagens**: WhatsApp › **Configurações › Aparelhos conectados › Conectar aparelho**, e aponte a câmera para o QR.
4. A janela avisa "WhatsApp conectado" em poucos segundos. Feche e recarregue a tela: o aviso some.

## 6. Testar

- Na ficha de um cliente de teste com o seu próprio número, use **WhatsApp › Enviar** e veja se a mensagem chega.
- Em **Mensagens**, o histórico mostra o envio.

## Depois que estiver funcionando

- **Desligue o servidor antigo:** se ainda existir, desligue a máquina antiga do Google Cloud (`34.74.115.57`), para não pagar por ela nem ter dois servidores ligados ao mesmo número.
- **Se a conexão cair:** o app volta a mostrar o aviso e o botão **Conectar WhatsApp**. Basta ler o QR de novo. Acontece, por exemplo, se o celular ficar muitos dias sem internet ou se alguém desconectar o aparelho no WhatsApp.
- **Atualizar a Evolution:** troque a versão da imagem em `render.yaml` (linha `url:`) e faça o deploy de novo no Render.

## Problemas comuns

| Sintoma | O que fazer |
|---|---|
| O deploy falha com erro de banco ou de migração | Confira se o endereço é o **Session pooler (5432)** e termina com `?schema=evolution`. |
| A página do serviço não abre | Veja os **Logs** no Render. O primeiro deploy pode levar alguns minutos. |
| "O servidor de WhatsApp não respondeu" no app | Confira `EVOLUTION_API_URL` na Vercel e se o Redeploy foi feito depois da troca. |
| Erro 401 ao conectar | A `EVOLUTION_API_KEY` da Vercel não bate com a `AUTHENTICATION_API_KEY` do Render. |

## Risco a conhecer

A Evolution é uma solução **não oficial**: ela imita o WhatsApp Web. Funciona bem para o volume do Beto, mas o WhatsApp pode bloquear números que ele considere automatizados. Para reduzir o risco, evite disparos em massa para quem não é cliente. Se um dia o número for bloqueado, o caminho é a **API oficial do WhatsApp (Meta)**, e aí o app precisa de ajustes.
