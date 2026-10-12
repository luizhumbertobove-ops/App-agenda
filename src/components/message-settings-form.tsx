"use client";

import { useState } from "react";
import { Save } from "lucide-react";
import {
  DEFAULT_CONFIRMATION_TEMPLATE,
  DEFAULT_PAYMENT_TEMPLATE,
  DEFAULT_REENGAGEMENT_TEMPLATE,
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

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <h3 className="font-semibold text-gray-900">Configurações de mensagens</h3>

      <TemplateField
        label="Confirmação de atendimento"
        hint="Variáveis: {{nome}}, {{hora}}"
        value={form.confirmationTemplate}
        placeholder={DEFAULT_CONFIRMATION_TEMPLATE}
        onChange={(v) => setForm((f) => ({ ...f, confirmationTemplate: v }))}
      />

      <TemplateField
        label="Link de pagamento"
        hint="Variáveis: {{nome}}, {{valor}}, {{pix}}"
        value={form.paymentTemplate}
        placeholder={DEFAULT_PAYMENT_TEMPLATE}
        onChange={(v) => setForm((f) => ({ ...f, paymentTemplate: v }))}
      />

      <TemplateField
        label="Reengajamento"
        hint="Variáveis: {{nome}}"
        value={form.reengagementTemplate}
        placeholder={DEFAULT_REENGAGEMENT_TEMPLATE}
        onChange={(v) => setForm((f) => ({ ...f, reengagementTemplate: v }))}
      />

      <TemplateField
        label="Não compareceu"
        hint="Variáveis: {{nome}}"
        value={form.noShowTemplate}
        placeholder={`Olá {{nome}}! Notei que você não pôde comparecer hoje. Quando quiser remarcar, é só chamar! 😊`}
        onChange={(v) => setForm((f) => ({ ...f, noShowTemplate: v }))}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
        <NumberField
          label="Confirmar com quantos dias de antecedência"
          value={form.confirmationDaysBefore}
          onChange={(v) => setForm((f) => ({ ...f, confirmationDaysBefore: v }))}
        />
        <NumberField
          label="Hora do envio de confirmações (0–23)"
          value={form.confirmationSendHour}
          onChange={(v) => setForm((f) => ({ ...f, confirmationSendHour: v }))}
        />
        <NumberField
          label="Reengajar após X dias inativo"
          value={form.reengagementInactivityDays}
          onChange={(v) => setForm((f) => ({ ...f, reengagementInactivityDays: v }))}
        />
        <NumberField
          label="Intervalo mínimo entre reengajamentos (dias)"
          value={form.reengagementCooldownDays}
          onChange={(v) => setForm((f) => ({ ...f, reengagementCooldownDays: v }))}
        />
      </div>

      <div className="pt-2 border-t border-gray-100">
        <label className="text-xs text-gray-500 block mb-1">Meta de faturamento mensal (R$) — aparece no Dashboard</label>
        <Input
          type="number"
          min={0}
          step={100}
          value={form.monthlyGoal || ""}
          placeholder="Ex: 5000"
          onChange={(e) => setForm((f) => ({ ...f, monthlyGoal: Number(e.target.value) }))}
          className="sm:w-48"
        />
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          <Save size={14} />
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
        {saved && <span className="text-sm text-green-600">Salvo ✓</span>}
      </div>
    </div>
  );
}

function TemplateField({
  label,
  hint,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-xs text-gray-400">{hint}</span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={4}
        className="font-mono"
      />
      {!value && <p className="text-xs text-gray-400 mt-1">Em branco = usa o texto padrão acima.</p>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <label className="text-xs text-gray-500 block mb-1">{label}</label>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  );
}
