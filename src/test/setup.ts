// Barreira extra: antes de qualquer teste, garante que o banco é local.
const { hostname } = new URL(process.env.DATABASE_URL ?? "");
if (hostname !== "localhost" && hostname !== "127.0.0.1") {
  throw new Error(`Testes recusados: DATABASE_URL não aponta para localhost (${hostname}).`);
}
