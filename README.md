# App-agenda

App de agenda e gestão de clientes da Bove Massoterapia: painel interno (`/`) e vitrine pública com agendamento online (`/vitrine`).

Para rodar, configurar os serviços externos e ver as pendências, leia o [HANDOFF.md](HANDOFF.md).

## Testes

As regras de agenda e financeiro (`src/lib/domain/`) têm testes que rodam contra um Postgres descartável em Docker, nunca contra o banco de produção.

```bash
npm run test:db   # sobe o container app-beto-testdb (porta 54329)
npm test
```
