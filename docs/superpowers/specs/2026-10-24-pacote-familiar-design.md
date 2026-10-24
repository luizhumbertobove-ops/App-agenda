# Pacote familiar — design curto

Data: 2026-10-24

## Intenção
Hoje um pacote de sessões pago adiantado pertence a um cliente só. O Beto quer vender um pacote que vários clientes (família, casal) usam juntos, gastando um **saldo único** até acabar.

## Metas
- Na venda do pacote (ficha do titular › Pacotes › "Vender pacote"), escolher outros clientes já cadastrados como membros.
- Adicionar e remover membros depois da venda, sem mexer no saldo.
- O pacote aparece na ficha de cada membro, com selo "Familiar" e o nome do titular.
- Ao concluir um atendimento de qualquer membro, "Pelo pacote" funciona como hoje (padrão quando há saldo).
- O pacote mostra quem usou cada sessão e quando.
- O Reabrir devolve a sessão ao mesmo pacote (já funciona assim).

## Fora do escopo
- Cota por pessoa: o saldo é único.
- Cadastrar cliente novo na hora de montar o pacote: os membros já são sempre clientes cadastrados.
- Cadastro de "famílias" como grupo à parte.
- Validade, cancelamento ou estorno do pacote (ideias antigas, continuam pendentes).

## Abordagens consideradas
1. **Tabela de membros ligada ao pacote (escolhida).** Nova tabela `PlanSubscriptionMember (subscriptionId, clientId)`. O titular continua em `PlanSubscription.clientId`. O banco garante a integridade, e o histórico sai dos atendimentos, que já gravam `clientId` + `planSubscriptionId`.
2. Coluna com a lista de IDs no pacote: migração menor, mas sem integridade e com consultas mais frágeis.
3. Entidade "Família" dona do pacote: um conceito e uma tela novos, e a família fica rígida (incluir alguém num só pacote obriga a mudar o grupo).

O usuário escolheu a 1, porque entrega o pedido mexendo pouco no que existe e deixa a 3 possível no futuro.

## Como fica
- **Banco:** migração manual `manual_pacote_familiar.sql` (padrão do projeto: SQL rodado no Supabase), criando a tabela com chave única `(subscriptionId, clientId)`, `ON DELETE CASCADE` nos dois lados e um índice em `clientId`. O titular **não** entra na tabela de membros.
- **"Pacotes do cliente"** passa a ser: pacotes em que ele é titular **ou** membro. Isso vale para: a escolha do pacote ao concluir (`api/appointments/[id]`, o mais antigo com saldo, como hoje), o saldo mostrado na agenda, a lista de clientes e a ficha do cliente.
- **Venda:** `POST api/clients/[id]/plans` aceita `memberIds` (opcional). O pagamento continua um só, no titular. Não pode incluir o próprio titular nem repetir membro.
- **Gerenciar membros:** rota nova para adicionar/remover membro de um pacote. Só o titular aparece como "dono"; na ficha do membro o pacote é só leitura quanto a membros (o Beto gerencia pela ficha do titular).
- **Histórico:** na ficha, cada pacote lista os atendimentos concluídos por ele (cliente + data).
- **Textos e telas** seguem a skill `design-system`.

## Decisões minhas (para conferir)
- **Excluir o titular** com pacote familiar ainda com saldo: o pacote passa para o membro mais antigo (vira titular), em vez de sumir para todos. Sem membros, segue apagando como hoje.
- **Excluir um membro:** sai da lista automaticamente (cascade); as sessões que ele já usou continuam contadas.
- Um cliente pode estar em mais de um pacote; ao concluir, usa o mais antigo com saldo, entre todos.

## Fica para quem constrói
- Layout exato do seletor de membros (busca entre clientes cadastrados) e do selo "Familiar".
- Testes: venda com membros, conclusão por membro, Reabrir, troca de titular na exclusão.
