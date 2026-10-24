export const dynamic = "force-dynamic";

import { prisma } from "@/lib/prisma";
import { formatDateBR } from "@/lib/date";
import { Users, Download, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ClientSearch } from "@/components/client-search";
import { EmptyState } from "@/components/empty-state";
import { pageShell } from "@/components/page-shell";

const PAGE_SIZE = 60;

/** Iniciais das duas primeiras palavras que começam com letra; ignora emoji. */
function iniciais(nome: string): string {
  const palavras = nome
    .trim()
    .split(/\s+/)
    .filter((p) => /^\p{L}/u.test(p))
    .slice(0, 2);
  if (palavras.length > 0) {
    return palavras.map((p) => (Array.from(p)[0] ?? "").toUpperCase()).join("");
  }
  return (Array.from(nome.trim())[0] ?? "?").toUpperCase();
}

/** Letra do grupo: primeira letra do nome, sem acento. Sem letra inicial vai para "#". */
function letraDoGrupo(nome: string): string {
  const primeira = Array.from(nome.trim())[0] ?? "";
  const base = primeira.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return /^\p{L}$/u.test(base) ? base : "#";
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;

  const where = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" as const } },
          { phone: { contains: q } },
        ],
      }
    : undefined;

  const total = await prisma.client.count({ where });
  const totalPaginas = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const paginaAtual = q
    ? 1
    : Math.min(Math.max(1, Number.parseInt(page ?? "1", 10) || 1), totalPaginas);

  const clients = await prisma.client.findMany({
    where,
    include: {
      appointments: { orderBy: { startTime: "desc" }, take: 1 },
      payments: { where: { status: { in: ["PENDING", "SENT", "OVERDUE"] } } },
      planSubscriptions: { where: { active: true }, include: { plan: true } },
    },
    orderBy: { name: "asc" },
    ...(q ? {} : { skip: (paginaAtual - 1) * PAGE_SIZE, take: PAGE_SIZE }),
  });

  // Agrupa por letra inicial, mantendo a ordem por nome; "#" fica no fim.
  const grupos = new Map<string, typeof clients>();
  for (const client of clients) {
    const letra = letraDoGrupo(client.name);
    const lista = grupos.get(letra);
    if (lista) lista.push(client);
    else grupos.set(letra, [client]);
  }
  const letras = [...grupos.entries()].sort(([a], [b]) => {
    if (a === "#") return 1;
    if (b === "#") return -1;
    return a.localeCompare(b, "pt-BR");
  });

  const eyebrow = q
    ? `${total} resultado${total !== 1 ? "s" : ""} para "${q}"`
    : `${total} cadastrado${total !== 1 ? "s" : ""}`;

  return (
    <div className={pageShell()}>
      <header className="mb-5 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-700">{eyebrow}</p>
          <h1 className="font-display text-3xl leading-tight text-gray-900">Clientes</h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/clientes/importar"
            aria-label="Importar do Google"
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 md:px-4"
          >
            <Download size={16} aria-hidden />
            <span className="hidden sm:inline">Importar do Google</span>
          </Link>
          <Link
            href="/clientes/novo"
            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-violet-600 px-4 text-sm font-medium text-white transition-colors hover:bg-violet-700"
          >
            <UserPlus size={16} aria-hidden />
            Novo cliente
          </Link>
        </div>
      </header>

      <div className="mb-4">
        <Suspense fallback={null}>
          <ClientSearch defaultValue={q} />
        </Suspense>
      </div>

      {clients.length === 0 ? (
        <EmptyState
          icon={<Users size={40} className="mx-auto mb-3 text-gray-300" aria-hidden />}
          title={q ? `Nenhum cliente encontrado para "${q}".` : "Nenhum cliente cadastrado ainda."}
          subtitle={q ? "Tente outro nome ou telefone." : "Cadastre o primeiro cliente para começar a agendar."}
          action={
            !q && (
              <Link
                href="/clientes/novo"
                className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-violet-600 px-5 text-sm font-medium text-white transition-colors hover:bg-violet-700"
              >
                <UserPlus size={16} aria-hidden />
                Cadastrar primeiro cliente
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-4">
          {letras.map(([letra, lista]) => (
            <section key={letra} aria-label={`Clientes com a letra ${letra}`}>
              <h2 className="sticky top-0 z-10 bg-gray-50 px-1 py-1.5 text-xs font-semibold text-gray-500">
                {letra}
              </h2>
              <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white @4xl:grid @4xl:grid-cols-2 @4xl:gap-3 @4xl:divide-y-0 @4xl:overflow-visible @4xl:border-0 @4xl:bg-transparent">
                {lista.map((client) => {
                  const lastAppt = client.appointments[0];
                  const pendingCount = client.payments.length;
                  const activePlan = client.planSubscriptions[0];
                  const temTelefone = client.phone !== "00000000000";

                  return (
                    <li key={client.id}>
                      <Link
                        href={`/clientes/${client.id}`}
                        className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 @4xl:rounded-xl @4xl:border @4xl:border-gray-200 @4xl:bg-white @4xl:hover:border-violet-300"
                      >
                        <span
                          aria-hidden
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 text-sm font-semibold text-violet-700"
                        >
                          {iniciais(client.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-gray-900">{client.name}</span>
                          <span className="block truncate text-xs text-gray-500">
                            {temTelefone && `${client.phone} · `}
                            {lastAppt ? `última visita ${formatDateBR(lastAppt.startTime)}` : "sem atendimentos ainda"}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          {activePlan && (
                            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-700">
                              {activePlan.plan.name}
                            </span>
                          )}
                          {pendingCount > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                              {pendingCount} {pendingCount === 1 ? "cobrança pendente" : "cobranças pendentes"}
                            </span>
                          )}
                        </span>
                        <ChevronRight size={16} className="shrink-0 text-gray-300" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {!q && totalPaginas > 1 && (
            <nav aria-label="Paginação" className="flex items-center justify-between gap-3 pt-2 text-sm">
              {paginaAtual > 1 ? (
                <Link
                  href={`/clientes?page=${paginaAtual - 1}`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-gray-200 bg-white px-4 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  <ChevronLeft size={16} aria-hidden />
                  Anteriores
                </Link>
              ) : (
                <span />
              )}
              <span className="text-gray-500">
                Página {paginaAtual} de {totalPaginas}
              </span>
              {paginaAtual < totalPaginas ? (
                <Link
                  href={`/clientes?page=${paginaAtual + 1}`}
                  className="inline-flex min-h-11 items-center gap-1 rounded-full border border-gray-200 bg-white px-4 font-medium text-gray-700 transition-colors hover:bg-gray-50"
                >
                  Mais clientes
                  <ChevronRight size={16} aria-hidden />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
