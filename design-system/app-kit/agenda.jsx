// Agenda — dia (linha do tempo das 7h às 19h) e semana; status, bloqueio e novo agendamento.
function AgendaScreen({ appointments, setStatus, openNew, openBlock, openClient }) {
  const { Tabs, Badge, Button, IconButton } = DS;
  const [view, setView] = React.useState("dia");
  const [day, setDay] = React.useState(12);
  const [openId, setOpenId] = React.useState(null);
  const byTime = Object.fromEntries(appointments.map((a) => [a.time, a]));
  const weekLoad = { 12: appointments.filter((a) => !a.block).length, 13: 3, 14: 5, 15: 2, 16: 4 };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)", paddingBottom: 96 }}>
      <Header eyebrow="Outubro 2026" title="Agenda"
        action={<IconButton label="Bloquear horário" variant="outline" icon={<Icon name="lock" size={18} />} onClick={openBlock} />} />
      <div style={{ padding: "0 var(--space-20)" }}>
        <Tabs value={view} onChange={setView} items={[{ value: "dia", label: "Dia" }, { value: "semana", label: "Semana" }]} />
      </div>

      {view === "dia" && (
        <>
          <div style={{ padding: "0 var(--space-20)", display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
            {WEEK.map((w) => {
              const on = w.n === day;
              return (
                <button key={w.n} onClick={() => setDay(w.n)} style={{ height: 64, borderRadius: "var(--radius-control)", border: "1px solid " + (on ? "var(--action-primary)" : "var(--border-hairline)"), background: on ? "var(--action-primary)" : "var(--surface-card)", color: on ? "var(--action-primary-fg)" : "var(--text-body)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", font: "inherit" }}>
                  <span style={{ font: "var(--type-caption)", opacity: on ? 0.9 : 1, color: on ? "inherit" : "var(--text-muted)" }}>{w.d}</span>
                  <span style={{ fontSize: 20, fontWeight: 600 }}>{w.n}</span>
                </button>
              );
            })}
          </div>

          <div style={{ padding: "0 var(--space-20)", display: "flex", flexDirection: "column" }}>
            {HOURS.map((h) => {
              const a = byTime[h];
              return (
                <div key={h} style={{ display: "flex", gap: "var(--space-12)", minHeight: 60, borderTop: "1px solid var(--border-hairline)", padding: "8px 0" }}>
                  <span style={{ width: 48, flex: "none", paddingTop: 6, font: "var(--type-caption)", fontSize: 14, fontVariantNumeric: "tabular-nums", color: "var(--text-muted)" }}>{h}</span>
                  {!a && (
                    <button onClick={() => openNew(h)} style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, border: "1px dashed var(--border-default)", borderRadius: "var(--radius-control)", background: "transparent", padding: "0 12px", color: "var(--text-muted)", font: "var(--type-body)", fontSize: 15, cursor: "pointer" }}>
                      <Icon name="plus" size={16} />Livre
                    </button>
                  )}
                  {a && a.block && (
                    <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8, borderRadius: "var(--radius-control)", background: "var(--surface-sunken)", padding: "0 12px", color: "var(--text-muted)", font: "var(--type-body)", fontSize: 15 }}>
                      <Icon name="lock" size={16} />{a.block} · {a.time}–{a.end}
                    </div>
                  )}
                  {a && !a.block && (
                    <div style={{ flex: 1, borderRadius: "var(--radius-control)", background: "var(--surface-card)", boxShadow: "var(--shadow-inset-hairline), var(--shadow-soft)", padding: "10px 12px", display: "flex", flexDirection: "column", gap: 8, opacity: a.status === "cancelado" ? 0.6 : 1 }}>
                      <button onClick={() => setOpenId(openId === a.id ? null : a.id)} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                          <span style={{ font: "var(--type-body)", fontWeight: 600, color: "var(--text-strong)" }}>{clientById(a.client).name}</span>
                          <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{a.time}–{a.end} · {a.service}</span>
                        </span>
                        <Badge tone={STATUS[a.status].tone} dot>{STATUS[a.status].label}</Badge>
                      </button>
                      {openId === a.id && (
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <Button size="sm" variant="primary" onClick={() => { setStatus(a.id, "confirmado"); setOpenId(null); }}>Confirmar</Button>
                          <Button size="sm" variant="secondary" onClick={() => { setStatus(a.id, "concluido"); setOpenId(null); }}>Concluir</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setStatus(a.id, "faltou"); setOpenId(null); }}>Faltou</Button>
                          <Button size="sm" variant="ghost" onClick={() => { setStatus(a.id, "cancelado"); setOpenId(null); }}>Cancelar</Button>
                          <Button size="sm" variant="ghost" iconLeft={<Icon name="user-round" size={16} />} style={{ gridColumn: "1 / -1" }} onClick={() => openClient(a.client)}>Ver ficha</Button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {view === "semana" && (
        <div style={{ padding: "0 var(--space-20)", display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
          {WEEK.map((w) => (
            <button key={w.n} onClick={() => { setDay(w.n); setView("dia"); }} style={{ all: "unset", cursor: "pointer", display: "flex", alignItems: "center", gap: "var(--space-16)", padding: "var(--space-16)", borderRadius: "var(--radius-card)", background: w.n === 12 ? "var(--surface-gold-soft)" : "var(--surface-card)", boxShadow: "var(--shadow-inset-hairline)" }}>
              <span style={{ width: 52, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{w.d}</span>
                <span style={{ fontFamily: "var(--font-serif-display)", fontSize: 28, lineHeight: 1 }}>{w.n}</span>
              </span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <span style={{ font: "var(--type-body)", color: "var(--text-strong)" }}>{weekLoad[w.n]} atendimentos{w.n === 12 ? " · hoje" : ""}</span>
                <Progress value={(weekLoad[w.n] / 12) * 100} />
              </span>
              <Icon name="chevron-right" size={18} />
            </button>
          ))}
          <p style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>Sábado e domingo ficam fora da agenda online — combinados direto pelo WhatsApp.</p>
        </div>
      )}

      <button onClick={() => openNew(null)} aria-label="Novo agendamento" style={{ position: "absolute", right: 20, bottom: 96, zIndex: 20, height: 56, padding: "0 22px 0 18px", borderRadius: 999, border: 0, background: "var(--action-primary)", color: "var(--action-primary-fg)", boxShadow: "var(--shadow-lifted)", display: "flex", alignItems: "center", gap: 8, font: "var(--type-body)", fontWeight: 600, cursor: "pointer" }}>
        <Icon name="plus" size={20} />Agendar
      </button>
    </div>
  );
}

function NovoAgendamentoSheet({ open, presetTime, onClose, onSave }) {
  const { Select, Textarea, Checkbox, Button, TimeSlot } = DS;
  const [client, setClient] = React.useState(null);
  const [service, setService] = React.useState(SERVICES[5].name);
  const [day, setDay] = React.useState(12);
  const [time, setTime] = React.useState(presetTime);
  const [charge, setCharge] = React.useState(true);
  const [repeat, setRepeat] = React.useState(false);
  React.useEffect(() => { setTime(presetTime); }, [presetTime, open]);
  const slots = ["07:00", "08:00", "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
  const taken = ["08:00", "09:00", "11:00", "15:00"];
  return (
    <Sheet open={open} title="Novo agendamento" onClose={onClose}
      footer={<>
        <Button variant="ghost" onClick={onClose}>Voltar</Button>
        <Button fullWidth disabled={!client || !time} onClick={() => onSave({ client, service, time, charge, repeat })}>{!client ? "Escolha o cliente" : !time ? "Escolha um horário" : "Confirmar agendamento"}</Button>
      </>}>
      <ClientPicker value={client} onChange={setClient} />
      <Select label="Serviço" value={service} onChange={(e) => setService(e.target.value)} options={SERVICES.map((s) => ({ value: s.name, label: s.name + " · 50 min · R$ 80" }))} />
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ font: "var(--type-caption)", fontWeight: 500, color: "var(--text-body)" }}>Dia</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
          {WEEK.map((w) => {
            const on = day === w.n;
            return (
              <button key={w.n} onClick={() => setDay(w.n)} style={{ height: 52, borderRadius: "var(--radius-control)", border: "1px solid " + (on ? "var(--action-primary)" : "var(--border-default)"), background: on ? "var(--surface-accent-soft)" : "var(--surface-card)", boxShadow: on ? "0 0 0 1px var(--action-primary)" : "none", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", font: "inherit", color: "var(--text-strong)" }}>
                <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{w.d}</span>
                <span style={{ fontSize: 17, fontWeight: 600 }}>{w.n}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <span style={{ font: "var(--type-caption)", fontWeight: 500, color: "var(--text-body)" }}>Horário</span>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {slots.map((t) => <TimeSlot key={t} time={t} state={day === 12 && taken.includes(t) ? "taken" : time === t ? "selected" : "available"} onClick={() => setTime(t)} />)}
        </div>
      </div>
      <Textarea label="Observações" rows={2} placeholder="Queixa, preferência de pressão, cuidados." />
      <Checkbox label="Gerar cobrança Pix" description="O Pix vai pelo WhatsApp quando você concluir a sessão." checked={charge} onChange={() => setCharge(!charge)} />
      <Checkbox label="Repetir toda semana" description="Mesmo dia e horário, até você cancelar." checked={repeat} onChange={() => setRepeat(!repeat)} />
    </Sheet>
  );
}

function BloquearSheet({ open, onClose, onSave }) {
  const { Select, Input, Button } = DS;
  return (
    <Sheet open={open} title="Bloquear horário" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Voltar</Button><Button fullWidth onClick={onSave}>Bloquear</Button></>}>
      <p style={{ font: "var(--type-body)", color: "var(--text-muted)" }}>O horário some da vitrine e ninguém consegue reservar.</p>
      <Select label="Dia" options={WEEK.map((w) => ({ value: w.n, label: w.d + ", " + w.n + " de outubro" }))} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Select label="Das" options={HOURS.map((h) => ({ value: h, label: h }))} />
        <Select label="Até" options={HOURS.map((h) => ({ value: h, label: h }))} />
      </div>
      <Input label="Motivo (só você vê)" placeholder="Almoço, curso, consulta" />
    </Sheet>
  );
}

Object.assign(window, { AgendaScreen, NovoAgendamentoSheet, BloquearSheet });
