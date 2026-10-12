// Clientes — busca, filtros, lista por letra, ficha e cadastro.
function ClientesScreen({ openClient, openNew }) {
  const { IconButton, Tag } = DS;
  const [q, setQ] = React.useState("");
  const [filter, setFilter] = React.useState("todos");
  const filters = [
    { v: "todos", l: "Todos" },
    { v: "sumidos", l: "Sem vir há 30+ dias", test: (c) => /mes|meses|semanas/.test(c.last) },
    { v: "idosos", l: "Idosos", test: (c) => c.tags.includes("Idosa") },
    { v: "faltas", l: "Com faltas", test: (c) => c.misses > 0 }
  ];
  const f = filters.find((x) => x.v === filter);
  const list = CLIENTS.filter((c) => (!q || c.name.toLowerCase().includes(q.toLowerCase()) || c.phone.includes(q)) && (!f.test || f.test(c)))
    .sort((a, b) => a.name.replace(/^(Dona|Sr\.) /, "").localeCompare(b.name.replace(/^(Dona|Sr\.) /, "")));
  const groups = {};
  list.forEach((c) => { const k = c.name.replace(/^(Dona|Sr\.) /, "")[0]; (groups[k] = groups[k] || []).push(c); });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-16)", paddingBottom: "var(--space-24)" }}>
      <Header eyebrow="532 cadastrados" title="Clientes"
        action={<div style={{ display: "flex", gap: 8 }}>
          <IconButton label="Importar do Google" variant="outline" icon={<Icon name="download" size={18} />} />
          <IconButton label="Novo cliente" variant="solid" icon={<Icon name="user-plus" size={18} />} onClick={openNew} />
        </div>} />
      <div style={{ padding: "0 var(--space-20)", display: "flex", flexDirection: "column", gap: "var(--space-12)" }}>
        <DS.Input placeholder="Buscar por nome ou telefone" value={q} onChange={(e) => setQ(e.target.value)} prefix={<Icon name="search" size={16} />} />
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
          {filters.map((x) => <Tag key={x.v} selected={filter === x.v} onClick={() => setFilter(x.v)} style={{ whiteSpace: "nowrap", flex: "none" }}>{x.l}</Tag>)}
        </div>
      </div>
      {Object.keys(groups).map((k) => (
        <Section key={k} title={k}>
          <ListCard>
            {groups[k].map((c, i) => (
              <ListRow key={c.id} last={i === groups[k].length - 1} onClick={() => openClient(c.id)}>
                <Avatar name={c.name} />
                <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
                  <span style={{ font: "var(--type-body)", color: "var(--text-strong)" }}>{c.name}</span>
                  <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{c.phone} · última vez {c.last}</span>
                </span>
                <Icon name="chevron-right" size={18} style={{ color: "var(--text-subtle)" }} />
              </ListRow>
            ))}
          </ListCard>
        </Section>
      ))}
      {list.length === 0 && <p style={{ padding: "0 var(--space-20)", font: "var(--type-body)", color: "var(--text-muted)" }}>Ninguém com esse nome ou telefone.</p>}
    </div>
  );
}

function ClienteDetalhe({ id, appointments, payments, onBack, onSchedule, onCharge }) {
  const { Button, IconButton, Badge, Tag } = DS;
  const c = clientById(id);
  const hist = [
    { when: "6 out", what: "Massagem relaxante", status: "concluido" },
    { when: "22 set", what: "Massagem relaxante", status: "concluido" },
    { when: "8 set", what: "Ventosaterapia", status: "faltou" }
  ];
  const pays = payments.filter((p) => p.client === id);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)", paddingBottom: "var(--space-24)" }}>
      <div style={{ padding: "var(--space-8) var(--space-20) 0" }}>
        <button onClick={onBack} style={{ display: "inline-flex", alignItems: "center", gap: 4, border: 0, background: "none", padding: "6px 0", font: "var(--type-body)", fontSize: 15, color: "var(--text-link)", cursor: "pointer" }}><Icon name="chevron-left" size={18} />Clientes</button>
      </div>
      <div style={{ padding: "0 var(--space-20)", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-12)", textAlign: "center" }}>
        <Avatar name={c.name} size={84} />
        <h1 style={{ fontSize: 30 }}>{c.name}</h1>
        <span style={{ font: "var(--type-body)", color: "var(--text-muted)" }}>{c.phone}</span>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {c.tags.map((t) => <Tag key={t}>{t}</Tag>)}
          <Tag icon={<Icon name="plus" size={14} />}>Etiqueta</Tag>
        </div>
      </div>
      <div style={{ padding: "0 var(--space-20)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Button size="sm" fullWidth style={{ padding: 0 }} iconLeft={<Icon name="message-circle" size={16} />}>WhatsApp</Button>
        <Button size="sm" fullWidth style={{ padding: 0 }} variant="secondary" iconLeft={<Icon name="calendar-plus" size={16} />} onClick={onSchedule}>Agendar</Button>
        <Button size="sm" fullWidth style={{ padding: 0 }} variant="secondary" iconLeft={<Icon name="qr-code" size={16} />} onClick={onCharge}>Cobrar</Button>
      </div>
      <div style={{ padding: "0 var(--space-20)", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
        <Stat icon="wallet" label="Total" value={"R$ " + c.spent.toLocaleString("pt-BR")} />
        <Stat icon="calendar-check" label="Sessões" value={c.visits} />
        <Stat icon="calendar-x" label="Faltas" value={c.misses} />
      </div>
      {c.notes && (
        <Section title="Observações de saúde" action={<LinkButton>Editar</LinkButton>}>
          <div style={{ padding: "var(--space-16)", borderRadius: "var(--radius-card)", background: "var(--surface-gold-soft)", boxShadow: "inset 0 0 0 1px var(--gold-200)", font: "var(--type-body)", color: "var(--text-body)" }}>{c.notes}</div>
        </Section>
      )}
      <Section title="Atendimentos">
        <ListCard>
          {hist.map((h, i) => (
            <ListRow key={i} last={i === hist.length - 1}>
              <span style={{ width: 52, font: "var(--type-caption)", fontSize: 14, color: "var(--text-muted)" }}>{h.when}</span>
              <span style={{ flex: 1, font: "var(--type-body)" }}>{h.what}</span>
              <Badge tone={STATUS[h.status].tone}>{STATUS[h.status].label}</Badge>
            </ListRow>
          ))}
        </ListCard>
      </Section>
      <Section title="Pagamentos">
        {pays.length === 0 ? <p style={{ font: "var(--type-body)", color: "var(--text-muted)" }}>Nenhuma cobrança ainda.</p> : (
          <ListCard>
            {pays.map((p, i) => (
              <ListRow key={p.id} last={i === pays.length - 1}>
                <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                  <span style={{ font: "var(--type-body)" }}>{money(p.value)}</span>
                  <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{p.what} · {p.when}</span>
                </span>
                <Badge tone={p.status === "pago" ? "success" : "warning"} dot>{p.status === "pago" ? "Pago" : "Pendente"}</Badge>
              </ListRow>
            ))}
          </ListCard>
        )}
      </Section>
      <div style={{ padding: "0 var(--space-20)", display: "flex", gap: 8 }}>
        <Button variant="ghost" size="sm" iconLeft={<Icon name="pencil" size={16} />}>Editar dados</Button>
        <Button variant="ghost" size="sm" iconLeft={<Icon name="trash-2" size={16} />}>Excluir</Button>
      </div>
    </div>
  );
}

function NovoClienteSheet({ open, onClose, onSave }) {
  const { Input, Textarea, Button } = DS;
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  return (
    <Sheet open={open} title="Novo cliente" onClose={onClose}
      footer={<><Button variant="ghost" onClick={onClose}>Voltar</Button><Button fullWidth disabled={!name || phone.length < 10} onClick={() => { onSave(name); setName(""); setPhone(""); }}>Cadastrar</Button></>}>
      <Input label="Nome" placeholder="Como a pessoa gosta de ser chamada" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="WhatsApp" placeholder="(16) 99999-9999" hint="Com DDD. É por aqui que vão as confirmações e o Pix." value={phone} onChange={(e) => setPhone(e.target.value)} prefix={<Icon name="phone" size={16} />} />
      <Input label="E-mail (opcional)" placeholder="nome@email.com" />
      <Textarea label="Observações de saúde (opcional)" rows={3} placeholder="Pressão, cirurgias, alergias, cuidados para subir na maca." />
      <Button variant="secondary" iconLeft={<Icon name="download" size={16} />}>Importar contatos do Google</Button>
    </Sheet>
  );
}

Object.assign(window, { ClientesScreen, ClienteDetalhe, NovoClienteSheet });
