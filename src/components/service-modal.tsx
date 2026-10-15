"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus } from "lucide-react";
import { Modal } from "@/components/modal";

type Service = {
  id: string;
  name: string;
  durationMins: number;
  price: number;
  active: boolean;
  description?: string | null;
  sessionDetails?: string | null;
};
type ServiceData = {
  name: string;
  durationMins: number;
  price: number;
  active: boolean;
  description: string | null;
  sessionDetails: string | null;
};

const labelClass = "mb-1.5 block text-sm font-medium text-gray-700";
const inputClass =
  "min-h-11 w-full rounded-xl border border-gray-200 bg-white px-3 text-[15px] text-gray-900 placeholder:text-gray-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-200";
const primaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-full bg-violet-600 px-5 text-[15px] font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex min-h-11 w-full items-center justify-center rounded-full border border-violet-300 bg-white px-5 text-[15px] font-medium text-violet-700 transition-colors hover:bg-violet-50";

function ServiceForm({
  title,
  initial,
  onSave,
  onClose,
  onDelete,
}: {
  title: string;
  initial?: Partial<Service>;
  onSave: (data: ServiceData) => Promise<void>;
  onClose: () => void;
  onDelete?: () => void;
}) {
  const ids = {
    name: useId(),
    duration: useId(),
    price: useId(),
    switch: useId(),
    description: useId(),
    sessionDetails: useId(),
  };
  const [name, setName] = useState(initial?.name ?? "");
  const [duration, setDuration] = useState(String(initial?.durationMins ?? 60));
  const [price, setPrice] = useState(
    initial?.price != null ? initial.price.toFixed(2).replace(".", ",") : "",
  );
  const [active, setActive] = useState(initial?.active ?? true);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [sessionDetails, setSessionDetails] = useState(initial?.sessionDetails ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = parseFloat(price.replace(",", "."));
    const d = parseInt(duration);
    if (!name.trim() || isNaN(p) || isNaN(d)) {
      setError("Preencha todos os campos corretamente.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onSave({
        name: name.trim(),
        durationMins: d,
        price: p,
        active,
        description: description.trim() || null,
        sessionDetails: sessionDetails.trim() || null,
      });
      onClose();
    } catch {
      setError("Erro ao salvar serviço.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 p-5">
      <h3 className="font-display text-2xl text-gray-900">{title}</h3>

      <div>
        <label htmlFor={ids.name} className={labelClass}>
          Nome
        </label>
        <input
          id={ids.name}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ex: Massagem relaxante"
          required
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={ids.duration} className={labelClass}>
            Duração (min)
          </label>
          <input
            id={ids.duration}
            type="number"
            inputMode="numeric"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            min={5}
            step={5}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={ids.price} className={labelClass}>
            Preço (R$)
          </label>
          <input
            id={ids.price}
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="0,00"
            required
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor={ids.description} className={labelClass}>
          O que é <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id={ids.description}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Um resumo do serviço para quem ainda não conhece."
          className={`${inputClass} py-2.5`}
        />
      </div>

      <div>
        <label htmlFor={ids.sessionDetails} className={labelClass}>
          Como é a sessão <span className="font-normal text-gray-400">(opcional)</span>
        </label>
        <textarea
          id={ids.sessionDetails}
          value={sessionDetails}
          onChange={(e) => setSessionDetails(e.target.value)}
          rows={4}
          placeholder="O passo a passo do atendimento: como começa, o que você faz, como termina."
          className={`${inputClass} py-2.5`}
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Os dois textos aparecem na vitrine quando o cliente toca no serviço.
        </p>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <p id={ids.switch} className="text-[15px] font-medium text-gray-900">
            Mostrar na vitrine
          </p>
          <p className="text-sm text-gray-500">Clientes veem este serviço ao agendar sozinhos.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={active}
          aria-labelledby={ids.switch}
          onClick={() => setActive((v) => !v)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
            active ? "bg-violet-600" : "bg-gray-300"
          }`}
        >
          <span
            aria-hidden="true"
            className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
              active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <div className="space-y-2">
        <button type="submit" disabled={loading} className={primaryButtonClass}>
          {loading ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          Voltar
        </button>
      </div>

      {onDelete && (
        <div className="border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onDelete}
            className="flex min-h-11 w-full items-center justify-center text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
          >
            Excluir serviço
          </button>
        </div>
      )}
    </form>
  );
}

export function NewServiceModal({ fullLabel = false }: { fullLabel?: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSave(data: ServiceData) {
    const res = await fetch("/api/servicos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao criar serviço");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Novo serviço"
        className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full bg-violet-600 text-[15px] font-medium text-white transition-colors hover:bg-violet-700 ${
          fullLabel ? "px-5" : "h-11 w-11 sm:w-auto sm:px-5"
        }`}
      >
        <Plus size={18} aria-hidden="true" />
        <span className={fullLabel ? "" : "hidden sm:inline"}>Novo serviço</span>
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} maxWidth="sm">
          <ServiceForm
            title="Novo serviço"
            onSave={handleSave}
            onClose={() => setOpen(false)}
          />
        </Modal>
      )}
    </>
  );
}

export function EditServiceModal({ service }: { service: Service }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  async function handleSave(data: ServiceData) {
    const res = await fetch(`/api/servicos/${service.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Erro ao atualizar serviço");
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Excluir o serviço "${service.name}"?`)) return;
    await fetch(`/api/servicos/${service.id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Editar serviço"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-gray-500 transition-colors hover:bg-violet-50 hover:text-violet-600"
      >
        <Pencil size={18} aria-hidden="true" />
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} maxWidth="sm">
          <ServiceForm
            title="Editar serviço"
            initial={service}
            onSave={handleSave}
            onClose={() => setOpen(false)}
            onDelete={handleDelete}
          />
        </Modal>
      )}
    </>
  );
}
