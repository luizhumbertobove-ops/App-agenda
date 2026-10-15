"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Search, X } from "lucide-react";

export function ClientSearch({ defaultValue }: { defaultValue?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set("q", value);
    } else {
      params.delete("q");
    }
    // Ao mudar a busca, volta para a primeira página da lista.
    params.delete("page");
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="relative">
      <Search
        size={18}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
        aria-hidden
      />
      <input
        type="search"
        aria-label="Buscar clientes"
        defaultValue={defaultValue}
        onChange={(e) => update(e.target.value)}
        placeholder="Buscar por nome ou telefone"
        className={`min-h-12 w-full rounded-full border border-gray-200 bg-white pl-11 pr-12 text-base shadow-sm placeholder:text-gray-400 transition-opacity focus:outline-none focus:ring-2 focus:ring-violet-300 ${
          isPending ? "opacity-60" : ""
        }`}
      />
      {defaultValue && (
        <button
          type="button"
          onClick={() => update("")}
          aria-label="Limpar busca"
          className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-gray-400 transition-colors hover:text-gray-600"
        >
          <X size={16} aria-hidden />
        </button>
      )}
    </div>
  );
}
