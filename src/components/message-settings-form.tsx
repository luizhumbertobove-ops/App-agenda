"use client";

import { useState } from "react";
import {
  DEFAULT_CONFIRMATION_TEMPLATE,
  DEFAULT_PAYMENT_TEMPLATE,
  DEFAULT_REENGAGEMENT_TEMPLATE,
  DEFAULT_NO_SHOW_TEMPLATE,
} from "@/lib/evolution";
import { Button } from "@/components/button";
import { Input, Textarea } from "@/components/input";

type Settings = {
  confirmationTemplate: string | null;
  paymentTemplate: string | null;
  reengagementTemplate: string | null;
  noShowTemplate: string | null;
  confirmationDaysBefore: number;
  confirmationSendHour: number;
  reengagementInactivityDays: number;
  reengagementCooldownDays: number;
  monthlyGoal: number | null;
};

type CampoModelo = "confirmationTemplate" | "paymentTemplate" | "reengagementTemplate" | "noShowTemplate";

const MODELOS: { campo: CampoModelo; titulo: string; variaveis: string[]; padrao: string }[] = [
  { campo: "confirmationTemplate", titulo: "Confirmação", variaveis: ["nome", "hora"], padrao: DEFAULT_CONFIRMATION_TEMPLATE },
  { campo: "paymentTemplate", titulo: "Link de pagamento", variaveis: ["nome", "valor", "pix"], padrao: DEFAULT_PAYMENT_TEMPLATE },
  { campo: "reengagementTemplate", titulo: "Reengajamento", variaveis: ["nome"], padrao: DEFAULT_REENGAGEMENT_TEMPLATE },
  { campo: "noShowTemplate", titulo: "Não compareceu", variaveis: ["nome"], padrao: DEFAULT_NO_SHOW_TEMPLATE },
];

const EXEMPLOS: Record<string, string> = {
  nome: "Ana",
  hora: "15:00",
  valor: "80,00",
  pix: "código Pix",
};

/** Troca as variáveis por exemplos e tira as crases do Pix, para a prévia ficar como no WhatsApp. */
function textoDeExemplo(texto: string): string {
  return texto.replace(/\{\{(\w+)\}\}/g, (_, v: string) => EXEMPLOS[v] ?? "").replace(/`/g, "");
}

/** Balão no estilo WhatsApp: *trecho* vira negrito. */
function BalaoPrevia({ texto }: { texto: string }) {
  const partes = textoDeExemplo(texto).split(/\*([^*\n]+)\*/);
  return (
    <div className="max-w-[90%] break-words rounded-2xl rounded-tl-sm bg-green-50 p-3 text-sm whitespace-pre-line text-gray-800">
      {partes.map((parte, i) =>
        i % 2 === 1 ? <strong key={i}>{parte}</strong> : <span key={i}>{parte}</span>
      )}
    </div>
  );
}

export function MessageSettingsForm({ settings }: { settings: Settings }) {
  const [form, setForm] = useState({
    confirmationTemplate: settings.confirmationTemplate ?? "",
    paymentTemplate: settings.paymentTemplate ?? "",
    reengagementTemplate: settings.reengagementTemplate ?? "",
    noShowTemplate: settings.noShowTemplate ?? "",
    confirmationDaysBefore: settings.confirmationDaysBefore,
    confirmationSendHour: settings.confirmationSendHour,
    reengagementInactivityDays: settings.reengagementInactivityDays,
    reengagementCooldownDays: settings.reengagementCooldownDays,
    monthlyGoal: settings.monthlyGoal ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          confirmationTemplate: form.confirmationTemplate || null,
          paymentTemplate: form.paymentTemplate || null,
          reengagementTemplate: form.reengagementTemplate || null,
          noShowTemplate: form.noShowTemplate || null,
          monthlyGoal: form.monthlyGoal > 0 ? form.monthlyGoal : null,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  function inserirVariavel(campo: CampoModelo, padrao: string, variavel: string) {
    setForm((f) => {
      const atual = f[campo] || padrao;
      const separador = atual && !/\s$/.test(atual) ? " " : "";
      return { ...f, [campo]: `${atual}${separador}{{${variavel}}}` };
    });
  }

  return (
    <div className="space-y-8">
      <section className="space-y-4">
        <h2 className="font-display text-2xl text-gray-900">Modelos de mensagem</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {MODELOS.map(({ campo, titulo, variaveis, padrao }) => (
            <div key={campo} className="space-y-3 rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="font-semibold text-gray-900">{titulo}</h3>

              <div className="flex flex-wrap gap-2" aria-label={`Variáveis de ${titulo}`}>
                {variaveis.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => inserirVariavel(campo, padrao, v)}
                    className="min-h-11 rounded-full border border-gray-200 bg-white px-3 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <p className="text-xs text-gray-500">Prévia</p>
                <BalaoPrevia texto={form[campo] || padrao} />
              </div>

              <div>
                <label htmlFor={campo} className="mb-1 block text-sm font-medium text-gray-700">
                  Editar texto
                </label>
                <Textarea
                  id={campo}
                  value={form[campo]}
                  onChange={(e) => setForm((f) => ({ ...f, [campo]: e.target.value }))}
                  placeholder={padrao}
                  rows={5}
                  className="min-h-28 rounded-xl border-gray-200"
                />
                {!form[campo] && (
                  <p className="mt-1 text-xs text-gray-500">Em branco = usa o texto padrão.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-2xl text-gray-900">Automação</h2>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <CampoNumero
              id="confirmationDaysBefore"
              label="Confirmar com quantos dias de antecedência"
              value={form.confirmationDaysBefore}
              onChange={(v) => setForm((f) => ({ ...f, confirmationDaysBefore: v }))}
            />
            <CampoNumero
              id="confirmationSendHour"
              label="Hora do envio das confirmações (0 a 23)"
              value={form.confirmationSendHour}
              min={0}
              max={23}
              onChange={(v) => setForm((f) => ({ ...f, confirmationSendHour: v }))}
            />
            <CampoNumero
              id="reengagementInactivityDays"
              label="Mandar saudade depois de quantos dias sem vir"
              value={form.reengagementInactivityDays}
              onChange={(v) => setForm((f) => ({ ...f, reengagementInactivityDays: v }))}
            />
            <CampoNumero
              id="reengagementCooldownDays"
              label="Intervalo mínimo entre saudades (dias)"
              value={form.reengagementCooldownDays}
              onChange={(v) => setForm((f) => ({ ...f, reengagementCooldownDays: v }))}
            />
          </div>

          <div className="mt-4 border-t border-gray-100 pt-4">
            <label htmlFor="monthlyGoal" className="mb-1 block text-sm font-medium text-gray-700">
              Meta de faturamento do mês
            </label>
            <div className="relative sm:max-w-xs">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-500">
                R$
              </span>
              <Input
                id="monthlyGoal"
                type="number"
                min={0}
                step={100}
                placeholder="5000"
                value={form.monthlyGoal || ""}
                onChange={(e) => setForm((f) => ({ ...f, monthlyGoal: Number(e.target.value) }))}
                className="min-h-11 pl-10"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">Aparece no Início.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Salvando..." : "Salvar"}
        </Button>
        {saved && (
          <span role="status" className="text-sm text-green-700">
            Configurações salvas.
          </span>
        )}
      </div>
    </div>
  );
}

function CampoNumero({
  id,
  label,
  value,
  min = 0,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="min-h-11"
      />
    </div>
  );
}
