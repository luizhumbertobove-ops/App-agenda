"use client";

import { useEffect, useState } from "react";

import type { ClientOption } from "@/lib/types";

// Guardada enquanto o app está aberto: abrir o formulário de novo não busca outra vez.
let cache: ClientOption[] | null = null;

/**
 * Lista de clientes para a busca dos formulários, carregada só quando o formulário abre
 * (antes ia junto com cada página, ~1.000 clientes a cada navegação).
 */
export function useClientList(enabled: boolean): ClientOption[] | null {
  const [clients, setClients] = useState<ClientOption[] | null>(cache);

  useEffect(() => {
    if (!enabled || cache) return;
    let vivo = true;
    fetch("/api/clients?simple=1")
      .then((r) => r.json())
      .then((data: ClientOption[]) => {
        cache = data;
        if (vivo) setClients(data);
      })
      .catch(() => vivo && setClients([]));
    return () => {
      vivo = false;
    };
  }, [enabled]);

  return clients;
}

/** Cliente criado agora: entra na lista guardada para aparecer na próxima busca. */
export function addToClientList(client: ClientOption) {
  if (cache) cache = [...cache, client].sort((a, b) => a.name.localeCompare(b.name));
}
