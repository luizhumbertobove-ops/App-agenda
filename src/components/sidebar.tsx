"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  DollarSign,
  MessageSquare,
  LogOut,
  Package,
  List,
  Globe,
  Store,
  Star,
  X,
} from "lucide-react";

const links = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/servicos", label: "Serviços", icon: Package },
  { href: "/conteudo-vitrine", label: "Vitrine", icon: Store },
  { href: "/avaliacoes", label: "Avaliações", icon: Star },
];

/** No celular, a barra de baixo mostra só as quatro telas do dia a dia; o resto fica em "Mais". */
const mobileMain = links.slice(0, 4);
const mobileMore = links.slice(4);

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);
  // Destaque imediato no toque: vale até a tela trocar (aí o pathname assume).
  const [tapped, setTapped] = useState<{ href: string; from: string } | null>(null);
  const pendingHref = tapped && tapped.from === pathname ? tapped.href : null;

  if (pathname === "/login" || pathname.startsWith("/vitrine")) return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const moreActive = pendingHref
    ? mobileMore.some((l) => l.href === pendingHref)
    : mobileMore.some((l) => isActive(pathname, l.href));

  return (
    <>
      {/* Computador: barra lateral clara, com a assinatura no topo */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-gray-200 bg-white py-6">
        <div className="px-6 mb-8">
          <p className="font-display text-[26px] leading-none text-gray-900">Humberto Bove</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-px w-8 bg-amber-500" />
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-gray-500">Massoterapeuta</span>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {links.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex min-h-11 items-center gap-3 rounded-full px-4 text-[15px] transition-colors ${
                  active
                    ? "bg-violet-600 font-medium text-white"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3">
          <Link
            href="/vitrine"
            target="_blank"
            className="flex min-h-11 items-center gap-3 rounded-full px-4 text-[15px] text-gray-600 hover:bg-gray-100"
          >
            <Globe size={18} strokeWidth={1.75} />
            Ver vitrine
          </Link>
          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-[15px] text-gray-500 hover:bg-gray-100"
          >
            <LogOut size={18} strokeWidth={1.75} />
            Sair
          </button>
        </div>
      </aside>

      {/* Celular: barra inferior com alvos de 56px */}
      <nav
        data-mobile-nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        {mobileMain.map(({ href, label, icon: Icon }) => {
          const active = pendingHref ? pendingHref === href : isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => {
                setMoreOpen(false);
                if (!isActive(pathname, href)) setTapped({ href, from: pathname });
              }}
              className={`flex h-16 touch-manipulation flex-col items-center justify-center gap-1 text-[11px] ${
                active ? "font-semibold text-violet-700" : "text-gray-500"
              }`}
            >
              <span className={`flex h-8 w-14 items-center justify-center rounded-full ${active ? "bg-violet-100" : ""}`}>
                <Icon size={22} strokeWidth={1.75} />
              </span>
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          aria-expanded={moreOpen}
          className={`flex h-16 touch-manipulation flex-col items-center justify-center gap-1 text-[11px] ${
            moreActive || moreOpen ? "font-semibold text-violet-700" : "text-gray-500"
          }`}
        >
          <span className={`flex h-8 w-14 items-center justify-center rounded-full ${moreActive || moreOpen ? "bg-violet-100" : ""}`}>
            <List size={22} strokeWidth={1.75} />
          </span>
          Mais
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-30 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-gray-950/50" />
          <div
            className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-gray-50 px-5 pb-28 pt-3 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300" />
            <div className="mb-3 flex items-center justify-between">
              <p className="font-display text-2xl text-gray-900">Mais</p>
              <button
                onClick={() => setMoreOpen(false)}
                aria-label="Fechar"
                className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              {mobileMore.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => {
                    setMoreOpen(false);
                    if (!isActive(pathname, href)) setTapped({ href, from: pathname });
                  }}
                  className="flex min-h-14 touch-manipulation items-center gap-3 border-b border-gray-200 px-4 text-base text-gray-800"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  {label}
                </Link>
              ))}
              <Link
                href="/vitrine"
                target="_blank"
                onClick={() => setMoreOpen(false)}
                className="flex min-h-14 items-center gap-3 border-b border-gray-200 px-4 text-base text-gray-800"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
                  <Globe size={20} strokeWidth={1.75} />
                </span>
                Ver vitrine
              </Link>
              <button onClick={handleLogout} className="flex min-h-14 w-full items-center gap-3 px-4 text-base text-gray-500">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
                  <LogOut size={20} strokeWidth={1.75} />
                </span>
                Sair
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
