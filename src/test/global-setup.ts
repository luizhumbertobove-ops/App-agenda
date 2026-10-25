import { execSync } from "node:child_process";

// Duplicado de vitest.config.ts de propósito: o setup global roda antes de qualquer
// teste e não pode depender de um valor vindo de outro módulo.
const TEST_DATABASE_URL = "postgresql://postgres:test@localhost:54329/app_beto_test";

export default function setup() {
  const { hostname } = new URL(TEST_DATABASE_URL);
  if (hostname !== "localhost" && hostname !== "127.0.0.1") {
    throw new Error(`Testes recusados: banco de teste não é local (${hostname}).`);
  }

  // Sincroniza o schema sem apagar nada; os dados são limpos por resetDb() entre testes.
  execSync("npx prisma db push", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
  });
}
