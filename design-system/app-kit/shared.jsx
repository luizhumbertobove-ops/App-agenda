// App do Humberto — base compartilhada: dados de exemplo, moldura e peças de tela.
// Todos os nomes e telefones são fictícios.
const DS = window.BoveMassoterapia;
const Icon = DS.Icon;

const SERVICES = [
  "Acupuntura", "Auriculoterapia", "Drenagem linfática", "Liberação miofascial",
  "Massagem modeladora", "Massagem relaxante", "Massagem terapêutica", "Pedras quentes",
  "Quiropraxia", "Shiatsu", "Ventosaterapia"
].map((name, i) => ({ id: "s" + i, name, duration: 50, price: 80, vitrine: true }));

const CLIENTS = [
  { id: "c1", name: "Carla Mendes", phone: "(16) 99812-4410", last: "há 6 dias", visits: 14, spent: 1120, misses: 0, tags: ["Relaxante", "Mensal"], notes: "Prefere pressão média. Tensão no trapézio." },
  { id: "c2", name: "Dona Neusa Ribeiro", phone: "(16) 99734-2081", last: "há 13 dias", visits: 31, spent: 2480, misses: 1, tags: ["Terapêutica", "Idosa"], notes: "Artrose no joelho direito. Ajudar a subir na maca." },
  { id: "c3", name: "Sr. Antônio Lima", phone: "(16) 99155-7302", last: "há 20 dias", visits: 9, spent: 720, misses: 0, tags: ["Acupuntura"], notes: "Hipertenso, controlado. Lombalgia crônica." },
  { id: "c4", name: "Marina Costa", phone: "(16) 98820-1147", last: "há 2 meses", visits: 3, spent: 240, misses: 1, tags: ["Modeladora"], notes: "" },
  { id: "c5", name: "João Pereira", phone: "(16) 99410-6623", last: "há 9 dias", visits: 6, spent: 480, misses: 0, tags: ["Ventosa"], notes: "Corre de manhã. Panturrilhas." },
  { id: "c6", name: "Teresa Alves", phone: "(16) 99267-3390", last: "há 4 meses", visits: 2, spent: 160, misses: 0, tags: [], notes: "" },
  { id: "c7", name: "Paulo Henrique", phone: "(16) 99678-5512", last: "ontem", visits: 22, spent: 1760, misses: 2, tags: ["Shiatsu", "Semanal"], notes: "Prefere o primeiro horário." },
  { id: "c8", name: "Beatriz Fonseca", phone: "(16) 98134-9087", last: "há 3 semanas", visits: 5, spent: 400, misses: 0, tags: ["Drenagem"], notes: "Pós-operatório liberado pelo médico." },
  { id: "c9", name: "Rogério Santos", phone: "(16) 99901-2276", last: "há 1 mês", visits: 11, spent: 880, misses: 0, tags: ["Auriculo"], notes: "" },
  { id: "c10", name: "Sueli Martins", phone: "(16) 99345-6618", last: "há 5 dias", visits: 18, spent: 1440, misses: 0, tags: ["Relaxante", "Idosa"], notes: "Vem acompanhada da filha." }
];

const FIRST_APPOINTMENTS = [
  { id: "a1", time: "08:00", end: "08:50", client: "c7", service: "Shiatsu", status: "confirmado" },
  { id: "a2", time: "09:00", end: "09:50", client: "c2", service: "Massagem terapêutica", status: "agendado" },
  { id: "a3", time: "11:00", end: "11:50", client: "c1", service: "Massagem relaxante", status: "agendado" },
  { id: "b1", time: "12:00", end: "13:00", block: "Almoço" },
  { id: "a4", time: "15:00", end: "15:50", client: "c3", service: "Acupuntura", status: "agendado" }
];

const FIRST_PAYMENTS = [
  { id: "p1", client: "c5", what: "Ventosaterapia", when: "9 out", value: 80, status: "pendente" },
  { id: "p2", client: "c4", what: "Massagem modeladora", when: "8 out", value: 80, status: "pendente" },
  { id: "p3", client: "c8", what: "Drenagem linfática", when: "7 out", value: 80, status: "pendente" },
  { id: "p4", client: "c7", what: "Shiatsu", when: "11 out", value: 80, status: "pago" },
  { id: "p5", client: "c10", what: "Massagem relaxante", when: "7 out", value: 80, status: "pago" },
  { id: "p6", client: "c1", what: "Pacote 4 sessões", when: "2 out", value: 300, status: "pago" }
];

const HOURS = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
const WEEK = [
  { d: "Seg", n: 12 }, { d: "Ter", n: 13 }, { d: "Qua", n: 14 }, { d: "Qui", n: 15 }, { d: "Sex", n: 16 }
];
const money = (v) => "R$ " + v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clientById = (id) => CLIENTS.find((c) => c.id === id) || { name: id, phone: "" };

const STATUS = {
  agendado: { tone: "neutral", label: "Agendado" },
  confirmado: { tone: "success", label: "Confirmado" },
  concluido: { tone: "accent", label: "Concluído" },
  faltou: { tone: "danger", label: "Faltou" },
  cancelado: { tone: "warning", label: "Cancelado" }
};

function StatusBar({ dark }) {
  return (
    <div style={{ height: 44, flex: "none", padding: "0 var(--space-24)", display: "flex", alignItems: "center", justifyContent: "space-between", font: "var(--type-caption)", fontWeight: 600, color: dark ? "var(--linen-50)" : "var(--text-strong)" }}>
      <span>9:41</span>
      <span style={{ display: "flex", gap: 6, alignItems: "center" }}><Icon name="signal" size={14} /><Icon name="wifi" size={14} /><Icon name="battery-full" size={16} /></span>
    </div>
  );
}

function Header({ eyebrow, title, onBack, action }) {
  return (
    <div style={{ padding: "var(--space-8) var(--space-20) var(--space-16)", display: "flex", flexDirection: "column", gap: "var(--space-8)" }}>
      {onBack && (
        <button onClick={onBack} style={{ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 4, border: 0, background: "none", padding: "6px 0", font: "var(--type-body)", fontSize: 15, color: "var(--text-link)", cursor: "pointer" }}>
          <Icon name="chevron-left" size={18} />Voltar
        </button>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "var(--space-12)" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
          {eyebrow && <span className="ds-eyebrow">{eyebrow}</span>}
          <h1 style={{ fontSize: 32, lineHeight: 1.1 }}>{title}</h1>
        </div>
        {action}
      </div>
    </div>
  );
}

function Section({ title, action, children, style }) {
  return (
    <section style={{ padding: "0 var(--space-20)", display: "flex", flexDirection: "column", gap: "var(--space-12)", ...style }}>
      {(title || action) && (
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
          <h3 style={{ fontFamily: "var(--font-sans-body)", fontSize: 17, fontWeight: 600, letterSpacing: 0 }}>{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

function LinkButton({ children, onClick }) {
  return <button onClick={onClick} style={{ border: 0, background: "none", padding: 0, font: "var(--type-caption)", fontSize: 14, fontWeight: 500, color: "var(--text-link)", cursor: "pointer" }}>{children}</button>;
}

function Avatar({ name, size = 44 }) {
  const parts = name.replace(/^(Dona|Sr\.|Sra\.)\s+/, "").split(" ");
  const ini = (parts[0][0] + (parts[1] ? parts[1][0] : "")).toUpperCase();
  return (
    <span aria-hidden="true" style={{ width: size, height: size, flex: "none", borderRadius: "50%", background: "var(--brown-100)", color: "var(--brown-700)", display: "inline-flex", alignItems: "center", justifyContent: "center", font: "var(--type-body)", fontSize: size * 0.36, fontWeight: 600 }}>{ini}</span>
  );
}

function ListCard({ children }) {
  return <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-inset-hairline), var(--shadow-soft)", overflow: "hidden" }}>{children}</div>;
}

function ListRow({ children, onClick, last }) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag onClick={onClick} style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: "var(--space-12)", padding: "14px var(--space-16)", minHeight: 64, border: 0, background: "transparent", borderBottom: last ? "none" : "1px solid var(--border-hairline)", cursor: onClick ? "pointer" : "default", font: "inherit", color: "inherit" }}>
      {children}
    </Tag>
  );
}

function Sheet({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 40, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "var(--surface-overlay)" }} />
      <div role="dialog" aria-label={title} style={{ position: "relative", maxHeight: "88%", display: "flex", flexDirection: "column", background: "var(--surface-page)", borderRadius: "var(--radius-sheet) var(--radius-sheet) 0 0", boxShadow: "var(--shadow-sheet)" }}>
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "var(--border-default)", margin: "10px auto 0" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "var(--space-12) var(--space-20) var(--space-8)" }}>
          <h2 style={{ fontSize: 26 }}>{title}</h2>
          <DS.IconButton label="Fechar" variant="quiet" icon={<Icon name="x" size={20} />} onClick={onClose} />
        </div>
        <div style={{ overflow: "auto", padding: "var(--space-8) var(--space-20) var(--space-16)", display: "flex", flexDirection: "column", gap: "var(--space-16)" }}>{children}</div>
        {footer && <div style={{ padding: "var(--space-12) var(--space-20) var(--space-24)", borderTop: "1px solid var(--border-hairline)", display: "flex", gap: "var(--space-12)" }}>{footer}</div>}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, hint, tone }) {
  return (
    <div style={{ background: "var(--surface-card)", borderRadius: "var(--radius-card)", boxShadow: "var(--shadow-inset-hairline)", padding: "var(--space-16)", display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6, font: "var(--type-caption)", color: "var(--text-muted)" }}><Icon name={icon} size={15} />{label}</span>
      <span style={{ fontFamily: "var(--font-serif-display)", fontSize: 24, lineHeight: 1.15, whiteSpace: "nowrap", color: tone === "gold" ? "var(--gold-700)" : "var(--text-strong)" }}>{value}</span>
      {hint && <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{hint}</span>}
    </div>
  );
}

function Progress({ value }) {
  return (
    <div style={{ height: 8, borderRadius: 4, background: "var(--brown-100)", overflow: "hidden" }}>
      <div style={{ width: Math.min(100, value) + "%", height: "100%", borderRadius: 4, background: "var(--gold-500)" }} />
    </div>
  );
}

function ClientPicker({ value, onChange }) {
  const [q, setQ] = React.useState(value ? clientById(value).name : "");
  const [open, setOpen] = React.useState(false);
  const hits = q.length > 0 ? CLIENTS.filter((c) => c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 4) : [];
  return (
    <div style={{ position: "relative" }}>
      <DS.Input label="Cliente" placeholder="Buscar pelo nome" value={q} prefix={<Icon name="search" size={16} />}
        onChange={(e) => { setQ(e.target.value); setOpen(true); onChange(null); }} />
      {open && hits.length > 0 && (
        <div style={{ marginTop: 6 }}><ListCard>
          {hits.map((c, i) => (
            <ListRow key={c.id} last={i === hits.length - 1} onClick={() => { setQ(c.name); setOpen(false); onChange(c.id); }}>
              <Avatar name={c.name} size={32} /><span style={{ font: "var(--type-body)" }}>{c.name}</span>
            </ListRow>
          ))}
        </ListCard></div>
      )}
    </div>
  );
}

Object.assign(window, { DS, Icon, SERVICES, CLIENTS, FIRST_APPOINTMENTS, FIRST_PAYMENTS, HOURS, WEEK, STATUS, money, clientById, StatusBar, Header, Section, LinkButton, Avatar, ListCard, ListRow, Sheet, Stat, Progress, ClientPicker });
