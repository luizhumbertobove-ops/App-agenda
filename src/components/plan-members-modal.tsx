"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { ClientCombobox } from "@/components/client-combobox";

type Client = { id: string; name: string; phone: string };

/** Lê a mensagem de erro da API; se não vier uma, usa o texto padrão. */
async function mensagemDeErro(res: Response, padrao: string): Promise<string> {
  const data = await res.json().catch(() => null);
  return typeof data?.error === "string" ? data.error : padrao;
}

/** Gerencia quem usa o pacote familiar além do titular. */
export function PlanMembersModal({
  subscriptionId,
  ownerId,
  members,
  clients,
}: {
  subscriptionId: string;
  ownerId: string;
  members: { clientId: string; name: string }[];
  clients: Client[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Muda a cada adição para o combobox limpar a busca.
  const [comboKey, setComboKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Quem ainda pode entrar: não é o titular nem quem já é membro.
  const disponiveis = clients.filter(
    (c) => c.id !== ownerId && !members.some((m) => m.clientId === c.id)
  );

  async function handleAdd(clientId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/plans/${subscriptionId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        setError(await mensagemDeErro(res, "Não foi possível adicionar."));
        return;
      }
      setComboKey((k) => k + 1);
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove(clientId: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/plans/${subscriptionId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
      if (!res.ok) {
        setError(await mensagemDeErro(res, "Não foi possível tirar do pacote."));
        return;
      }
      router.refresh();
    } catch {
      setError("Erro de conexão.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError("");
          setOpen(true);
        }}
        className="flex min-h-11 items-center gap-1.5 rounded-full border border-violet-300 bg-white px-4 text-sm font-medium text-violet-700 transition-colors hover:bg-violet-50"
      >
        <Users size={16} aria-hidden />
        Membros
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <div className="space-y-5 px-6 pt-4 pb-6">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-display text-xl text-gray-900">Membros do pacote</h3>
                <p className="text-sm text-gray-500">Todos usam o mesmo saldo.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Fechar"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Quem usa agora</p>
              {members.length === 0 ? (
                <p className="text-sm text-gray-500">Só o titular usa este pacote por enquanto.</p>
              ) : (
                <ul className="space-y-2">
                  {members.map((m) => (
                    <li
                      key={m.clientId}
                      className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2"
                    >
                      <span className="min-w-0 truncate text-sm text-gray-900">{m.name}</span>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleRemove(m.clientId)}
                        className="flex min-h-11 shrink-0 items-center rounded-full px-3 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                      >
                        Tirar do pacote
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Adicionar alguém</p>
              <ClientCombobox
                key={comboKey}
                clients={disponiveis}
                value=""
                onChange={(id) => {
                  if (id && !busy) handleAdd(id);
                }}
              />
            </div>

            <p className="text-xs text-gray-500">Quem sai do pacote não devolve as sessões que já usou.</p>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
          </div>
        </Modal>
      )}
    </>
  );
}
