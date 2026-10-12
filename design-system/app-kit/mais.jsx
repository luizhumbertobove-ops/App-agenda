// Mais — menu, Mensagens (WhatsApp automático) e Serviços.
const TEMPLATES = [
  { id: "conf", title: "Confirmação de atendimento", icon: "calendar-check", vars: ["nome", "hora"], text: "Oi, {{nome}}! Passando para confirmar seu horário amanhã às {{hora}}. Responda SIM para confirmar ou NÃO se precisar remarcar. Até lá, Humberto." },
  { id: "pix", title: "Link de pagamento", icon: "qr-code", vars: ["nome", "valor", "pix"], text: "Oi, {{nome}}, obrigado pela visita. Segue o Pix de R$ {{valor}}:\n{{pix}}\nQualquer dúvida, é só me chamar." },
  { id: "reeng", title: "Saudade", icon: "heart-handshake", vars: ["nome"], text: "Oi, {{nome}}, tudo bem? Faz um tempinho que você não vem. Que tal reservar uma sessão esta semana? Atendo de segunda a sexta, das 7h às 19h." },
  { id: "falta", title: "Não compareceu", icon: "calendar-x", vars: ["nome"], text: "Oi, {{nome}}, senti sua falta hoje. Quando quiser remarcar, é só me chamar." }
];

function MaisScreen({ go }) {
  const items = [
    { id: "mensagens", icon: "message-circle", title: "Mensagens", sub: "Confirmações, Pix e saudade pelo WhatsApp" },
    { id: "servicos", icon: "hand-heart", title: "Serviços", sub: "11 serviços · preços e vitrine" },
    { id: "vitrine", icon: "store", title: "Vitrine", sub: "A página onde os clientes agendam sozinhos" },
    { id: "sair", icon: "log-out", title: "Sair", sub: "" }
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)", paddingBottom: "var(--space-24)" }}>
      <Header eyebrow="Spaço Lhum" title="Mais" />
      <Section>
        <ListCard>
          {items.map((it, i) => (
            <ListRow key={it.id} last={i === items.length - 1} onClick={() => go(it.id)}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: it.id === "sair" ? "var(--surface-sunken)" : "var(--surface-gold-soft)", color: it.id === "sair" ? "var(--text-muted)" : "var(--gold-700)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Icon name={it.icon} size={20} /></span>
              <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--type-body)", fontWeight: 500, color: "var(--text-strong)" }}>{it.title}</span>
                {it.sub && <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{it.sub}</span>}
              </span>
              <Icon name="chevron-right" size={18} />
            </ListRow>
          ))}
        </ListCard>
      </Section>
      <div style={{ padding: "0 var(--space-20)", textAlign: "center", display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-serif-display)", fontStyle: "italic", fontWeight: 300, fontSize: 28 }}>Humberto Bove</span>
        <span style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ width: 40, height: 1, background: "var(--gold-500)" }} /><span className="ds-eyebrow">Massoterapia</span></span>
      </div>
    </div>
  );
}

function MensagensScreen({ onBack, toast, goal, setGoal }) {
  const { Button, Badge, Textarea, Tag, Input } = DS;
  const [editing, setEditing] = React.useState(null);
  const [texts, setTexts] = React.useState(Object.fromEntries(TEMPLATES.map((t) => [t.id, t.text])));
  const [cfg, setCfg] = React.useState({ dias: 1, hora: 18, reeng: 45, intervalo: 30 });
  const step = (k, d, min, max) => setCfg({ ...cfg, [k]: Math.max(min, Math.min(max, cfg[k] + d)) });
  const t = TEMPLATES.find((x) => x.id === editing);
  const Stepper = ({ label, k, unit, min, max }) => (
    <ListRow>
      <span style={{ flex: 1, font: "var(--type-body)", fontSize: 15 }}>{label}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <DS.IconButton label="Menos" size="sm" variant="outline" icon={<Icon name="minus" size={14} />} onClick={() => step(k, -1, min, max)} />
        <span style={{ minWidth: 56, textAlign: "center", font: "var(--type-body)", fontWeight: 600 }}>{cfg[k]}{unit}</span>
        <DS.IconButton label="Mais" size="sm" variant="outline" icon={<Icon name="plus" size={14} />} onClick={() => step(k, 1, min, max)} />
      </span>
    </ListRow>
  );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)", paddingBottom: "var(--space-24)" }}>
      <Header onBack={onBack} eyebrow="WhatsApp" title="Mensagens" />
      <Section>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {[["12", "Confirmações"], ["7", "Pix"], ["4", "Saudade"], ["1", "Faltas"]].map(([n, l]) => (
            <div key={l} style={{ textAlign: "center", padding: "12px 4px", borderRadius: "var(--radius-control)", background: "var(--surface-card)", boxShadow: "var(--shadow-inset-hairline)" }}>
              <div style={{ fontFamily: "var(--font-serif-display)", fontSize: 26 }}>{n}</div>
              <div style={{ font: "var(--type-caption)", fontSize: 12, color: "var(--text-muted)" }}>{l}</div>
            </div>
          ))}
        </div>
        <p style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>Enviadas em outubro.</p>
        <Button fullWidth iconLeft={<Icon name="send" size={16} />} onClick={() => toast("Confirmações enviadas", "3 clientes de amanhã receberam a mensagem.")}>Enviar confirmações de amanhã</Button>
        <Button fullWidth variant="secondary" iconLeft={<Icon name="heart-handshake" size={16} />} onClick={() => toast("Mensagens de saudade enviadas", "5 clientes sem vir há mais de " + cfg.reeng + " dias.")}>Mandar “saudade” para quem sumiu</Button>
      </Section>

      <Section title="Modelos">
        {TEMPLATES.map((tp) => (
          <div key={tp.id} style={{ background: "var(--surface-card)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-inset-hairline)", padding: "var(--space-16)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: "var(--gold-700)" }}><Icon name={tp.icon} size={18} /></span>
              <span style={{ flex: 1, font: "var(--type-body)", fontWeight: 600 }}>{tp.title}</span>
              <LinkButton onClick={() => setEditing(tp.id)}>Editar</LinkButton>
            </div>
            <div style={{ alignSelf: "flex-start", maxWidth: "92%", padding: "10px 12px", borderRadius: "14px 14px 14px 4px", background: "var(--surface-sage-soft)", font: "var(--type-caption)", fontSize: 14, lineHeight: 1.45, color: "var(--text-body)", whiteSpace: "pre-line" }}>
              {texts[tp.id].replace(/\{\{nome\}\}/g, "Carla").replace(/\{\{hora\}\}/g, "15:00").replace(/\{\{valor\}\}/g, "80,00").replace(/\{\{pix\}\}/g, "00020126…Pix copia e cola")}
            </div>
          </div>
        ))}
      </Section>

      <Section title="Automação">
        <ListCard>
          <Stepper label="Confirmar com antecedência de" k="dias" unit=" dia" min={1} max={3} />
          <Stepper label="Enviar confirmações às" k="hora" unit="h" min={7} max={21} />
          <Stepper label="Mandar saudade após" k="reeng" unit=" dias" min={15} max={180} />
          <Stepper label="Esperar entre saudades" k="intervalo" unit=" dias" min={7} max={90} />
        </ListCard>
        <Input label="Meta de faturamento do mês" value={goal.toLocaleString("pt-BR")} onChange={(e) => setGoal(Number(e.target.value.replace(/\D/g, "")) || 0)} prefix={<span style={{ color: "var(--text-muted)" }}>R$</span>} hint="Aparece no Início e no Financeiro." />
      </Section>

      <Section title="Histórico">
        <ListCard>
          {[["Paulo Henrique", "Confirmação", "hoje 18:00"], ["João Pereira", "Link de pagamento", "9 out 16:12"], ["Teresa Alves", "Saudade", "8 out 18:00"]].map(([n, k, w], i) => (
            <ListRow key={i} last={i === 2}>
              <Avatar name={n} size={36} />
              <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <span style={{ font: "var(--type-body)" }}>{n}</span>
                <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{k} · {w}</span>
              </span>
              <Badge tone="success">Entregue</Badge>
            </ListRow>
          ))}
        </ListCard>
      </Section>

      <Sheet open={!!editing} title={t ? t.title : ""} onClose={() => setEditing(null)}
        footer={<><Button variant="ghost" onClick={() => { setTexts({ ...texts, [editing]: t.text }); }}>Restaurar padrão</Button><Button fullWidth onClick={() => { setEditing(null); toast("Modelo salvo", "As próximas mensagens já saem com o texto novo."); }}>Salvar</Button></>}>
        {t && <>
          <Textarea label="Texto da mensagem" rows={6} value={texts[editing]} onChange={(e) => setTexts({ ...texts, [editing]: e.target.value })} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>Toque para inserir no texto</span>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {t.vars.map((v) => <Tag key={v} onClick={() => setTexts({ ...texts, [editing]: texts[editing] + " {{" + v + "}}" })}>{"{{" + v + "}}"}</Tag>)}
            </div>
          </div>
        </>}
      </Sheet>
    </div>
  );
}

function ServicosScreen({ onBack }) {
  const { Button, Switch, Input, Select, Textarea } = DS;
  const [items, setItems] = React.useState(SERVICES);
  const [edit, setEdit] = React.useState(null);
  const cur = items.find((s) => s.id === edit);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-24)", paddingBottom: "var(--space-24)" }}>
      <Header onBack={onBack} eyebrow={items.length + " serviços"} title="Serviços"
        action={<Button size="sm" iconLeft={<Icon name="plus" size={16} />} onClick={() => setEdit("novo")}>Novo</Button>} />
      <Section>
        <ListCard>
          {items.map((s, i) => (
            <ListRow key={s.id} last={i === items.length - 1} onClick={() => setEdit(s.id)}>
              <span style={{ flex: 1, display: "flex", flexDirection: "column" }}>
                <span style={{ fontFamily: "var(--font-serif-display)", fontSize: 19, color: "var(--text-strong)" }}>{s.name}</span>
                <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{s.duration} min · {money(s.price)}{s.vitrine ? " · na vitrine" : ""}</span>
              </span>
              <Icon name="chevron-right" size={18} />
            </ListRow>
          ))}
        </ListCard>
        <p style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>Na vitrine aparece “a partir de”. Valores podem variar em datas especiais ou fora do horário.</p>
      </Section>
      <Sheet open={!!edit} title={cur ? cur.name : "Novo serviço"} onClose={() => setEdit(null)}
        footer={<><Button variant="ghost" onClick={() => setEdit(null)}>Voltar</Button><Button fullWidth onClick={() => setEdit(null)}>Salvar</Button></>}>
        <Input label="Nome" defaultValue={cur ? cur.name : ""} placeholder="Pedras quentes" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Select label="Duração" defaultValue="50" options={[["30", "30 min"], ["50", "50 min"], ["60", "60 min"], ["90", "90 min"]].map(([v, l]) => ({ value: v, label: l }))} />
          <Input label="Preço" defaultValue={cur ? "80,00" : ""} prefix={<span style={{ color: "var(--text-muted)" }}>R$</span>} />
        </div>
        <Textarea label="Descrição para a vitrine" rows={3} placeholder="Uma frase sobre como é a sessão." />
        <Switch label="Mostrar na vitrine" defaultChecked={cur ? cur.vitrine : true} />
      </Sheet>
    </div>
  );
}

Object.assign(window, { TEMPLATES, MaisScreen, MensagensScreen, ServicosScreen });
