"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Users, Calendar, DollarSign, MessageSquare, LogOut, Package } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/financeiro", label: "Financeiro", icon: DollarSign },
  { href: "/mensagens", label: "Mensagens", icon: MessageSquare },
  { href: "/servicos", label: "Serviços", icon: Package },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login" || pathname.startsWith("/vitrine")) return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside className="w-16 md:w-56 bg-violet-700 flex flex-col py-6 shrink-0">
      <div className="px-4 mb-8 hidden md:block">
        <h1 className="text-white font-bold text-lg leading-tight">App Beto</h1>
        <p className="text-violet-300 text-xs">Agenda & Clientes</p>
      </div>

      <nav className="flex flex-col gap-1 px-2 flex-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-label={label}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-white text-violet-700"
                  : "text-violet-100 hover:bg-violet-600"
              }`}
            >
              <Icon size={18} className="shrink-0" />
              <span className="hidden md:block">{label}</span>
            </Link>
          );
        })}
      </nav>

      <button
        onClick={handleLogout}
        aria-label="Sair"
        className="flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm font-medium text-violet-100 hover:bg-violet-600 transition-colors"
      >
        <LogOut size={18} className="shrink-0" />
        <span className="hidden md:block">Sair</span>
      </button>
    </aside>
  );
}
