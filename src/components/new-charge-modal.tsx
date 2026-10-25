"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import { Input } from "@/components/input";
import { ClientCombobox } from "@/components/client-combobox";
import { useClientList } from "@/hooks/use-client-list";
import { apiRequest } from "@/lib/api-client";

export function NewChargeModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const clients = useClientList(open);
  const [clientId, setClientId] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function handleClose() {
    setOpen(false);
  }

  async function handleSubmit() {
    if (!clientId || !amount) return;
    setLoading(true);
    setError("");
    try {
      const r = await apiRequest("/api/payments/send", {
        method: "POST",
        body: { clientId, amount: Number(amount), description: description || undefined },
      }, "Erro ao gerar cobrança");
      if (!r.ok) {
        setError(r.error);
        return;
      }
      handleClose();
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} aria-label="Nova cobrança" className="flex items-center gap-2">
        <Plus size={16} />
        <span className="hidden sm:inline">Nova cobrança</span>
      </Button>
    );
  }

  return (
    <Modal onClose={handleClose}>
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900">Nova Cobrança</h3>
        <button
          onClick={handleClose}
          aria-label="Fechar"
          className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Cliente</label>
          {clients === null ? (
            <p className="text-sm text-gray-400">Carregando clientes...</p>
          ) : (
            <ClientCombobox clients={clients} value={clientId} onChange={(id) => setClientId(id)} />
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">Valor (R$)</label>
          <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-1.5">
            Descrição <span className="text-gray-400 font-normal">(opcional)</span>
          </label>
          <Input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Sessão de massagem"
          />
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

        <div className="flex gap-3 pt-1">
          <Button variant="secondary" onClick={handleClose} className="flex-1 py-2.5">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!clientId || !amount || loading} className="flex-1 py-2.5">
            {loading ? "Gerando..." : "Gerar Pix e enviar"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
