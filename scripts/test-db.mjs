// Sobe o Postgres descartável dos testes. Nunca aponta para produção: é um container local.
import { execSync } from "node:child_process";

const NAME = "app-beto-testdb";
const run = (cmd) => execSync(cmd, { stdio: "pipe" }).toString().trim();

try {
  run(`docker start ${NAME}`);
} catch {
  run(
    `docker run -d --name ${NAME} -e POSTGRES_PASSWORD=test -e POSTGRES_DB=app_beto_test -p 54329:5432 postgres:16-alpine`,
  );
}

const deadline = Date.now() + 30_000;
while (Date.now() < deadline) {
  try {
    run(`docker exec ${NAME} pg_isready -U postgres`);
    console.log(`Banco de teste pronto em localhost:54329 (container ${NAME}).`);
    process.exit(0);
  } catch {
    await new Promise((r) => setTimeout(r, 1000));
  }
}

console.error(`Banco de teste ${NAME} não ficou pronto em 30 s.`);
process.exit(1);
