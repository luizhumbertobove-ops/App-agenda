"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { Modal } from "@/components/modal";
import { Button } from "@/components/button";
import { Input, Textarea } from "@/components/input";

type Client = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  notes: string | null;
};

export function EditClientForm({ client }: { client: Client }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: client.name,
    phone: client.phone === "00000000000" ? "" : client.phone,
    email: client.email ?? "",
    notes: client.notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          phone: form.phone || "00000000000",
          email: form.email || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        const fieldErrors = data.error?.fieldErrors;
        setError(fieldErrors?.phone?.[0] ?? fieldErrors?.name?.[0] ?? "Erro ao salvar cliente");
        return;
      }
      setOpen(false);
      window.location.reload();
    } catch {
      setError("Erro de conexão ao salvar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 border border-gray-200 rounded-lg hover:bg-gray-50"
      >
        <Pencil size={13} />
        Editar
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)} className="p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Editar cliente</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nome</label>
              <Input value={form.name} ring="violet" onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Telefone (WhatsApp)</label>
              <Input
                value={form.phone}
                placeholder="5511999999999"
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">E-mail (opcional)</label>
              <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Observações</label>
              <Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>}
          <div className="flex gap-2 mt-5">
            <Button variant="secondary" onClick={() => setOpen(false)} className="flex-1 py-2">
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading} className="flex-1 py-2">
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
