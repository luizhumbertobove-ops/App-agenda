// Financeiro — meta do mês, recebido x a receber, seis meses e cobranças Pix.
function FinanceiroScreen({ payments, goal, openCharge, sendPix, markPaid }) {
  const { IconButton, Tabs, Badge, Button } = DS;
  const [tab, setTab] = React.useState("todos");
  const paid = payments.filter((p) => p.status === "pago").reduce((s, p) => s + p.value, 0) + 2020;
  const pend = payments.filter((p) => p.status === "pendente");
  const pendSum = pend.reduce((s, p) => s + p.value, 0);
  const months = [["mai", 3120], ["jun", 3480], ["jul", 2960], ["ago", 3840], ["set", 4160], ["out", paid]];
  const max = 4400;
  const list = payments.filter((p) => tab === "todos" || p.status === tab);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)", paddingBottom: "var(--space-24)" }}>
      <Header eyebrow="Outubro 2026" title="Financeiro"
        action={<div style={{ display: "flex", gap: 8 }}>
          <IconButton label="Exportar planilha" variant="outline" icon={<Icon name="file-down" size={18} />} />
          <IconButton label="Nova cobrança" variant="solid" icon={<Icon name="plus" size={18} />} onClick={openCharge} />
        </div>} />

      <Section>
        <div style={{ borderRadius: "var(--radius-card)", background: "var(--wash-gold)", boxShadow: "inset 0 0 0 1px var(--gold-200)", padding: "var(--space-20)", display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
          <span className="ds-eyebrow">Recebido no mês</span>
          <span style={{ fontFamily: "var(--font-serif-display)", fontSize: 40, lineHeight: 1 }}>{money(paid)}</span>
          <Progress value={(paid / goal) * 100} />
          <span style={{ font: "var(--type-caption)", fontSize: 14, color: "var(--text-body)" }}>Meta {money(goal)} · faltam {money(Math.max(0, goal - paid))}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)" }}>
          <Stat icon="hourglass" label="A receber" value={money(pendSum)} hint={pend.length + " pendentes"} tone="gold" />
          <Stat icon="trending-up" label="Previsto" value={money(paid + pendSum)} hint="recebido + a receber" />
        </div>
      </Section>

      <Section title="Últimos seis meses">
        <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-inset-hairline)", padding: "var(--space-16) var(--space-16) var(--space-12)" }}>
          <svg viewBox="0 0 300 150" width="100%" role="img" aria-label="Receita de maio a outubro">
            <line x1="0" x2="300" y1="120" y2="120" stroke="var(--border-hairline)" />
            {months.map(([m, v], i) => {
              const h = (v / max) * 100, x = 10 + i * 49, cur = i === months.length - 1;
              return (
                <g key={m}>
                  <rect x={x} y={120 - h} width="32" height={h} rx="6" fill={cur ? "var(--gold-500)" : "var(--brown-400)"} />
                  <text x={x + 16} y={114 - h} textAnchor="middle" style={{ font: "500 10px var(--font-sans-body)", fill: "var(--text-muted)" }}>{(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}k</text>
                  <text x={x + 16} y="138" textAnchor="middle" style={{ font: (cur ? "600" : "400") + " 12px var(--font-sans-body)", fill: cur ? "var(--text-strong)" : "var(--text-muted)" }}>{m}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </Section>

      <Section title="Cobranças">
        <Tabs value={tab} onChange={setTab} items={[{ value: "todos", label: "Todas" }, { value: "pendente", label: "Pendentes", count: pend.length }, { value: "pago", label: "Pagas" }]} />
        <ListCard>
          {list.map((p, i) => (
            <ListRow key={p.id} last={i === list.length - 1}>
              <Avatar name={clientById(p.client).name} size={36} />
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--type-body)", color: "var(--text-strong)" }}>{clientById(p.client).name}</span>
                <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{p.what} · {p.when}</span>
              </span>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                <span style={{ font: "var(--type-body)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{money(p.value)}</span>
                {p.status === "pago" ? <Badge tone="success" dot>Pago</Badge> : (
                  <span style={{ display: "flex", gap: 6 }}>
                    <button onClick={() => sendPix(p)} style={{ border: 0, background: "none", padding: 0, font: "var(--type-caption)", fontWeight: 600, color: "var(--text-link)", cursor: "pointer" }}>Reenviar</button>
                    <button onClick={() => markPaid(p.id)} style={{ border: 0, background: "none", padding: 0, font: "var(--type-caption)", fontWeight: 600, color: "var(--sage-600)", cursor: "pointer" }}>Recebi</button>
                  </span>
                )}
              </span>
            </ListRow>
          ))}
        </ListCard>
      </Section>
    </div>
  );
}

function CobrancaSheet({ open, onClose, onSave }) {
  const { Input, Button } = DS;
  const [client, setClient] = React.useState(null);
  const [value, setValue] = React.useState("80,00");
  return (
    <Sheet open={open} title="Nova cobrança" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Voltar</Button><Button fullWidth disabled={!client} iconLeft={<Icon name="send" size={16} />} onClick={() => onSave({ client, value })}>{client ? "Gerar Pix e enviar" : "Escolha o cliente"}</Button></>}>
      <ClientPicker value={client} onChange={setClient} />
      <Input label="Valor" value={value} onChange={(e) => setValue(e.target.value)} prefix={<span style={{ font: "var(--type-body)", color: "var(--text-muted)" }}>R$</span>} />
      <Input label="Descrição (opcional)" placeholder="Sessão de massagem relaxante" />
      <div style={{ padding: "var(--space-12) var(--space-16)", borderRadius: "var(--radius-control)", background: "var(--surface-sunken)", font: "var(--type-caption)", fontSize: 14, color: "var(--text-body)", display: "flex", gap: 8 }}>
        <Icon name="message-circle" size={16} />O cliente recebe a mensagem “Link de pagamento” com o código Pix no WhatsApp.
      </div>
    </Sheet>
  );
}

Object.assign(window, { FinanceiroScreen, CobrancaSheet });
