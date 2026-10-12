"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Input } from "@/components/input";

type Client = { id: string; name: string; phone: string };

/**
 * Busca cliente por nome com dropdown; opcionalmente permite criar um cliente novo
 * inline quando nenhum resultado bate com a busca (usado no agendamento, não na cobrança).
 * Vive dentro de um modal que desmonta ao fechar, então o estado de busca/criação
 * não precisa ser resetado por fora.
 */
export function ClientCombobox({
  clients: initialClients,
  value,
  onChange,
  allowCreate = false,
}: {
  clients: Client[];
  value: string;
  onChange: (clientId: string, name: string) => void;
  allowCreate?: boolean;
}) {
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientPhone, setNewClientPhone] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));
  const showDropdown = search.length > 0 && !value;

  function handleSelect(c: Client) {
    onChange(c.id, c.name);
    setSearch(c.name);
    setShowNewClient(false);
  }

  function handleSearchChange(v: string) {
    setSearch(v);
    onChange("", "");
    setShowNewClient(false);
  }

  async function handleCreateClient() {
    if (!search.trim() || !newClientPhone.trim()) return;
    setCreating(true);
    setCreateError("");

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: search.trim(), phone: newClientPhone.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        const fieldErrors = data.error?.fieldErrors;
        setCreateError(fieldErrors?.phone?.[0] ?? fieldErrors?.name?.[0] ?? "Erro ao criar cliente");
        return;
      }

      const created: Client = await res.json();
      setClients((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      onChange(created.id, created.name);
      setSearch(created.name);
      setShowNewClient(false);
      setNewClientPhone("");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="relative">
        <Input
          type="text"
          placeholder="Buscar cliente pelo nome..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
        {showDropdown && (
          <ul className="absolute z-10 w-full border border-gray-200 rounded-lg mt-1 bg-white shadow-lg max-h-48 overflow-y-auto">
            {filtered.length > 0
              ? filtered.slice(0, 8).map((c) => (
                  <li
                    key={c.id}
                    onClick={() => handleSelect(c)}
                    className="px-3 py-2 text-sm cursor-pointer hover:bg-violet-50 flex justify-between"
                  >
                    <span className="font-medium text-gray-800">{c.name}</span>
                    <span className="text-gray-400 text-xs">{c.phone}</span>
                  </li>
                ))
              : !allowCreate && <li className="px-3 py-2 text-sm text-gray-400">Nenhum cliente encontrado</li>}

            {allowCreate && search.trim().length >= 2 && (
              <li
                onClick={() => setShowNewClient(true)}
                className="px-3 py-2 text-sm cursor-pointer hover:bg-green-50 flex items-center gap-2 border-t border-gray-100 text-green-700"
              >
                <UserPlus size={14} />
                Criar cliente &quot;{search.trim()}&quot;
              </li>
            )}
          </ul>
        )}
      </div>

      {allowCreate && showNewClient && (
        <div className="mt-2 p-3 bg-green-50 rounded-lg border border-green-200 space-y-2">
          <p className="text-xs font-medium text-green-800">Novo cliente: {search.trim()}</p>
          <input
            autoFocus
            type="tel"
            placeholder="WhatsApp (somente números, com DDD)"
            value={newClientPhone}
            onChange={(e) => setNewClientPhone(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreateClient();
            }}
            className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300 bg-white"
          />
          {createError && <p className="text-xs text-red-600">{createError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCreateClient}
              disabled={creating || !newClientPhone.trim()}
              className="text-xs px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {creating ? "Criando..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowNewClient(false);
                setNewClientPhone("");
              }}
              className="text-xs px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
