"use client";

import { useEffect, useState } from "react";

/**
 * Busca uma lista de horários (ou qualquer JSON) na `url` informada sempre que ela muda.
 * `url` null pula a busca — quem chama decide o valor default nesse caso
 * (normalmente `data ?? []`), então o hook não precisa zerar estado sozinho.
 */
export function useSlots<T>(url: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [revalidateToken, setRevalidateToken] = useState(0);

  useEffect(() => {
    if (!url) return;

    const controller = new AbortController();
    // Fetch disparado por mudança de dependência (padrão "fetching data" da doc do
    // React) — o loading flag precisa refletir o início da requisição de forma síncrona.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);

    fetch(url, { signal: controller.signal })
      .then((r) => r.json())
      .then(setData)
      .catch((err) => {
        if (err.name !== "AbortError") console.error(err);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [url, revalidateToken]);

  function refetch() {
    setRevalidateToken((n) => n + 1);
  }

  return { data, loading, refetch };
}
