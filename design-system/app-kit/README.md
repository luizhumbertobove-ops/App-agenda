# UI kit — App do Humberto

O app de trabalho do Beto (hoje em appbeto-puce.vercel.app), redesenhado no sistema: celular 390×844, cinco abas no `BottomNav` e folhas (sheets) que sobem de baixo para cada ação. Todos os nomes, telefones e valores são fictícios.

**Telas**
- **Início** — saudação, próximo atendimento (faixa `surface-brand` com arcos dourados), meta do mês com barra dourada, agenda de hoje e cobranças em aberto com "Reenviar Pix". Botão de sincronizar com o Google Agenda.
- **Agenda** — abas Dia/Semana, faixa de dias (seg a sex), linha do tempo das 7h às 18h. Horário livre → toque para agendar; atendimento → toque para Confirmar, Concluir, Faltou, Cancelar ou ver a ficha. Bloquear horário. Botão flutuante "Agendar".
- **Novo agendamento** — cliente (busca), serviço, dia, horário (`TimeSlot`), observações, "Gerar cobrança Pix" e "Repetir toda semana".
- **Clientes** — busca por nome ou telefone, filtros (sem vir há 30+ dias, idosos, com faltas), lista por letra, importar do Google, novo cliente. **Ficha**: WhatsApp, Agendar, Cobrar; total gasto, sessões, faltas; observações de saúde em destaque dourado; atendimentos e pagamentos.
- **Financeiro** — recebido no mês sobre `wash-gold` com a meta, a receber e previsto, gráfico de seis meses (mês atual em dourado), cobranças com Reenviar/Recebi, exportar planilha, nova cobrança Pix.
- **Mais** → **Mensagens** (contadores do mês, enviar confirmações de amanhã, mandar "saudade", quatro modelos com prévia em balão e edição com variáveis `{{nome}}` `{{hora}}` `{{valor}}` `{{pix}}`, automação em passos, meta do mês, histórico) e **Serviços** (onze serviços — os nove do app mais Quiropraxia e Pedras quentes —, editar e "Mostrar na vitrine").

**Arquivos**
- `shared.jsx` — dados de exemplo, `StatusBar`, `Header`, `Section`, `ListCard`/`ListRow`, `Sheet`, `Stat`, `Progress`, `Avatar`, `ClientPicker`.
- `inicio.jsx`, `agenda.jsx`, `clientes.jsx`, `financeiro.jsx`, `mais.jsx` — uma área cada.

**Regras de uso**
- Uma ação principal por tela, sempre `Button` primário em pílula marrom; o resto é secondary ou ghost.
- Status de atendimento só por `Badge`: Agendado (neutro), Confirmado (sage), Concluído (dourado), Faltou (rust), Cancelado (ocre).
- Toda ação confirma com `Toast` no topo, repetindo o fato ("Sessão agendada — 12 out · 15:00").
- Os modelos de WhatsApp seguem a voz do README: sem emoji, uma exclamação no máximo.

Live view: the `AppKit` page under Components (`components/AppKit/preview.html`), which loads these `.jsx` files with Babel.
