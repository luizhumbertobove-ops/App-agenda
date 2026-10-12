// Início — o dia do Beto numa olhada: próximo atendimento, números do mês, agenda e cobranças.
function InicioScreen({ appointments, payments, goal, go, openClient, sendPix, sync }) {
  const { Button, IconButton, Badge } = DS;
  const visits = appointments.filter((a) => !a.block && a.status !== "cancelado");
  const next = visits.find((a) => a.status === "agendado" || a.status === "confirmado");
  const received = payments.filter((p) => p.status === "pago").reduce((s, p) => s + p.value, 0) + 2020;
  const pending = payments.filter((p) => p.status === "pendente");
  const pct = Math.round((received / goal) * 100);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)", paddingBottom: "var(--space-24)" }}>
      <Header eyebrow="Segunda, 12 de outubro" title="Bom dia, Beto."
        action={<IconButton label="Sincronizar agenda" variant="outline" icon={<Icon name="refresh-cw" size={18} />} onClick={sync} />} />

      {next && (
        <section style={{ padding: "0 var(--space-20)" }}>
          <div style={{ borderRadius: "var(--radius-card)", overflow: "hidden" }}>
            <div style={{ background: "var(--surface-brand)", color: "var(--linen-50)", padding: "var(--space-20)", display: "flex", flexDirection: "column", gap: "var(--space-12)", position: "relative" }}>
              <svg aria-hidden="true" viewBox="0 0 180 90" width="180" height="90" style={{ position: "absolute", right: -20, bottom: 0, pointerEvents: "none" }}>
                {[30, 54, 78].map((r) => <path key={r} d={`M${90 - r} 90 A${r} ${r} 0 0 1 ${90 + r} 90`} fill="none" stroke="var(--gold-300)" strokeWidth="1.5" opacity=".7" />)}
              </svg>
              <span style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: "var(--gold-200)" }}>Próximo atendimento · {next.time}</span>
              <div>
                <div style={{ fontFamily: "var(--font-serif-display)", fontStyle: "italic", fontSize: 30, lineHeight: 1.1 }}>{clientById(next.client).name}</div>
                <div style={{ font: "var(--type-body)", color: "rgba(255,251,245,.88)", marginTop: 4 }}>{next.service} · {next.time}–{next.end}</div>
              </div>
              <div style={{ display: "flex", gap: "var(--space-8)" }}>
                <Button variant="inverse" size="sm" iconLeft={<Icon name="message-circle" size={16} />}>WhatsApp</Button>
                <Button variant="ghost" size="sm" style={{ color: "var(--linen-50)", borderColor: "rgba(255,251,245,.4)" }} onClick={() => openClient(next.client)}>Ver ficha</Button>
              </div>
            </div>
          </div>
        </section>
      )}

      <Section>
        <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-inset-hairline)", padding: "var(--space-16)", display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>Meta de outubro</span>
            <span style={{ font: "var(--type-caption)", fontWeight: 600, color: "var(--gold-700)" }}>{pct}%</span>
          </div>
          <div style={{ fontFamily: "var(--font-serif-display)", fontSize: 28, lineHeight: 1.1 }}>{money(received)} <span style={{ fontSize: 17, color: "var(--text-muted)" }}>de {money(goal)}</span></div>
          <Progress value={pct} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--space-12)" }}>
          <Stat icon="calendar-days" label="Hoje" value={visits.length} hint="atendimentos" />
          <Stat icon="hourglass" label="A receber" value={money(pending.reduce((s, p) => s + p.value, 0))} hint={pending.length + " pendentes"} tone="gold" />
        </div>
      </Section>

      <Section title="Agenda de hoje" action={<LinkButton onClick={() => go("agenda")}>Ver agenda</LinkButton>}>
        <ListCard>
          {visits.map((a, i) => (
            <ListRow key={a.id} last={i === visits.length - 1} onClick={() => openClient(a.client)}>
              <span style={{ width: 48, flex: "none", fontVariantNumeric: "tabular-nums", font: "var(--type-body)", fontWeight: 600, color: "var(--text-strong)" }}>{a.time}</span>
              <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--type-body)", color: "var(--text-strong)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{clientById(a.client).name}</span>
                <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{a.service}</span>
              </span>
              <Badge tone={STATUS[a.status].tone} dot>{STATUS[a.status].label}</Badge>
            </ListRow>
          ))}
        </ListCard>
      </Section>

      <Section title="Cobranças em aberto" action={<LinkButton onClick={() => go("financeiro")}>Financeiro</LinkButton>}>
        {pending.length === 0 ? (
          <div style={{ padding: "var(--space-16)", borderRadius: "var(--radius-card)", background: "var(--surface-sage-soft)", font: "var(--type-body)", color: "var(--sage-700)" }}>Tudo em dia. Nenhuma cobrança em aberto.</div>
        ) : (
          <ListCard>
            {pending.map((p, i) => (
              <ListRow key={p.id} last={i === pending.length - 1}>
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span style={{ font: "var(--type-body)", color: "var(--text-strong)" }}>{clientById(p.client).name}</span>
                  <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{p.what} · {p.when} · {money(p.value)}</span>
                </span>
                <Button variant="secondary" size="sm" onClick={() => sendPix(p)}>Reenviar Pix</Button>
              </ListRow>
            ))}
          </ListCard>
        )}
      </Section>
    </div>
  );
}

Object.assign(window, { InicioScreen });
