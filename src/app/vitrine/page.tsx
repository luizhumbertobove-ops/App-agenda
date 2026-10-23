import "./bove-ds.css";

export const revalidate = 300;

import type { CSSProperties } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import {
  CalendarDays,
  MessageCircle,
  MapPin,
  Clock,
  AtSign,
  HandHeart,
  Wind,
  Droplets,
  Zap,
  Moon,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { formatCurrencyBR } from "@/lib/format";
import { whatsappLink } from "@/lib/vitrine";
import { getVitrineContent, LINK_GOOGLE_PADRAO } from "@/lib/vitrine-content";
import { getFotosGaleria } from "@/lib/galeria";
import { getAvaliacoesVitrine, getResumoAvaliacoes } from "@/lib/avaliacoes";
import { Button } from "@/components/vitrine/ds/Button";
import { SectionHeading } from "@/components/vitrine/ds/SectionHeading";
import { ServiceList } from "@/components/vitrine/service-list";
import { Icon } from "@/components/vitrine/ds/Icon";
import { Reveal } from "@/components/vitrine/reveal";
import { HeaderShadow } from "@/components/vitrine/header-shadow";
import { HeroPhoto } from "@/components/vitrine/hero-photo";
import { ParallaxPhoto } from "@/components/vitrine/parallax-photo";
import { Carrossel } from "@/components/vitrine/carrossel";
import { AvaliacoesLoop } from "@/components/vitrine/avaliacoes-loop";
import { GaleriaFotos } from "@/components/vitrine/galeria-fotos";
import { CartaoAvaliacao, Estrelas } from "@/components/vitrine/avaliacao-card";

export const metadata: Metadata = {
  title: "Humberto Bove — Massoterapeuta | Spaço Lhum",
  description:
    "Massoterapeuta em Serrana/SP. Agende seu horário com Humberto Bove (Spaço Lhum) pelo WhatsApp.",
};

// Atraso da entrada em cascata do hero (CSS .ds-enter lê --reveal-delay).
function enterDelay(ms: number): CSSProperties {
  return { ["--reveal-delay" as string]: `${ms}ms` } as CSSProperties;
}

async function getServices() {
  return prisma.service.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
  });
}

function Wordmark({
  tone = "default",
  size = 22,
  nome,
  espaco,
}: {
  tone?: "default" | "inverse";
  size?: number;
  nome: string;
  espaco: string;
}) {
  const color = tone === "inverse" ? "var(--linen-0)" : "var(--text-strong)";
  const sub = tone === "inverse" ? "rgba(255,253,251,.7)" : "var(--text-muted)";
  const rule = tone === "inverse" ? "rgba(255,253,251,.55)" : "var(--action-primary)";
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
      <span style={{ fontFamily: "var(--font-serif-display)", fontWeight: 300, fontStyle: "italic", fontSize: size, lineHeight: 1, letterSpacing: "-.02em", color }}>
        {nome}
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: size * 1.6, height: 1, background: rule, flex: "none" }} />
        <span style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: sub }}>
          {espaco}
        </span>
      </span>
    </span>
  );
}

export default async function VitrinePage() {
  const [services, c, fotos, avaliacoes, resumo] = await Promise.all([
    getServices(),
    getVitrineContent(),
    getFotosGaleria(),
    getAvaliacoesVitrine(),
    getResumoAvaliacoes(),
  ]);

  const { media, total: totalAvaliacoes } = resumo;
  // Só mostra "Ver todas no Google" com o link do Beto, não com o padrão genérico.
  const linkGoogle =
    c.avaliacoesLinkGoogle.startsWith("https://") && c.avaliacoesLinkGoogle !== LINK_GOOGLE_PADRAO
      ? c.avaliacoesLinkGoogle
      : null;

  const navLinks = [
    { href: "#servicos", label: c.menuServicos },
    { href: "#sobre", label: c.menuSobre },
    ...(avaliacoes.length > 0 ? [{ href: "#avaliacoes", label: c.menuAvaliacoes }] : []),
    { href: "#contato", label: c.menuContato },
  ];

  const benefits = [
    { icon: HandHeart, label: c.beneficio1 },
    { icon: Sparkles, label: c.beneficio2 },
    { icon: Droplets, label: c.beneficio3 },
    { icon: Zap, label: c.beneficio4 },
    { icon: Wind, label: c.beneficio5 },
    { icon: Moon, label: c.beneficio6 },
  ];

  const itensAvaliacoes = avaliacoes.map((a) => (
    <CartaoAvaliacao
      key={a.id}
      autor={a.author}
      nota={a.rating}
      texto={a.text}
      data={a.publishedAt ? format(a.publishedAt, "MMM yyyy", { locale: ptBR }).replace(".", "") : null}
    />
  ));

  const whatsappMessage = "Olá Humberto, vim pelo site e quero agendar um horário.";

  return (
    <div className="bove-ds" style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
      {/* Header */}
      <HeaderShadow
        className="sticky top-0 z-20 border-b"
        style={{ background: "rgba(250,246,241,.86)", backdropFilter: "var(--overlay-blur)", borderColor: "var(--border-hairline)" }}
      >
        <div className="max-w-[var(--container-max)] mx-auto flex items-center gap-6 lg:gap-10 px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-4">
          <Wordmark nome={c.nomeProfissional} espaco={c.nomeEspaco} />
          <nav className="hidden md:flex gap-8 ml-auto">
            {navLinks.map((l) => (
              <a key={l.href} href={l.href} style={{ font: "var(--type-body)", fontSize: "var(--size-body-s)", color: "var(--text-body)" }} className="ds-navlink no-underline">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto md:ml-0">
            <Button variant="primary" size="sm" href="/vitrine/agendar" iconLeft={<Icon icon={CalendarDays} size={16} />}>
              {c.headerBotaoAgendar}
            </Button>
          </div>
        </div>
      </HeaderShadow>

      {/* Hero */}
      <section className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-16 lg:py-[var(--section-y)] grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-10 lg:gap-[var(--space-72)] items-center">
        <div className="flex flex-col gap-6">
          <span className="ds-eyebrow ds-enter" style={enterDelay(0)}>{c.heroEyebrow}</span>
          <h1 className="ds-enter" style={{ fontSize: "clamp(36px, 6vw, 60px)", maxWidth: "16ch", ...enterDelay(90) }}>{c.heroTitulo}</h1>
          <p className="ds-enter" style={{ font: "var(--type-body-lead)", color: "var(--text-body)", maxWidth: "var(--measure-narrow)", ...enterDelay(180) }}>
            {c.heroTexto}
          </p>
          <div className="ds-enter flex flex-col sm:flex-row gap-3" style={enterDelay(270)}>
            <Button variant="primary" size="lg" href="/vitrine/agendar" iconLeft={<Icon icon={CalendarDays} size={18} />}>
              {c.heroBotaoAgendar}
            </Button>
            <Button
              variant="secondary"
              size="lg"
              href={whatsappLink(whatsappMessage, c.telefoneWhatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              iconLeft={<Icon icon={MessageCircle} size={18} />}
            >
              {c.heroBotaoWhatsapp}
            </Button>
          </div>
          <div className="ds-enter flex flex-col gap-2 pt-4 border-t" style={{ borderColor: "var(--border-hairline)", ...enterDelay(360) }}>
            {(
              [
                { icon: MapPin, text: c.heroCidade },
                { icon: Clock, text: c.horarioAtendimento },
                { icon: AtSign, text: c.heroInstagram },
              ] satisfies { icon: typeof MapPin; text: string }[]
            ).map(({ icon, text }) => (
              <span key={text} className="flex items-center gap-2" style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>
                <Icon icon={icon} size={15} />
                {text}
              </span>
            ))}
          </div>
        </div>
        <HeroPhoto
          src={c.imagemTopo}
          alt="Sessão de massoterapia no Spaço Lhum"
          className="relative rounded-[var(--radius-image)] overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[520px]"
          style={{ boxShadow: "var(--shadow-inset-hairline)" }}
        />
      </section>

      {/* Sobre / missão */}
      <section id="sobre" style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-14 lg:py-[var(--section-y)] grid grid-cols-1 lg:grid-cols-[.9fr_1.1fr] gap-10 lg:gap-[var(--space-72)] items-center">
          <Reveal className="relative rounded-[var(--radius-image)] overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[440px] order-2 lg:order-1" style={{ boxShadow: "var(--shadow-inset-hairline)" }}>
            <ParallaxPhoto src={c.imagemMissao} alt="Humberto Bove, massoterapeuta do Spaço Lhum" strength="soft" />
          </Reveal>
          <div className="flex flex-col gap-6 order-1 lg:order-2">
            <Reveal>
              <SectionHeading
                eyebrow={c.sobreEyebrow}
                title={c.sobreTitulo}
                description={c.sobreTexto}
              />
            </Reveal>
            <div className="grid grid-cols-2 gap-4">
              {benefits.map(({ icon, label }, i) => (
                <Reveal key={label} as="span" delay={i} className="flex items-start gap-3" style={{ font: "var(--type-body)", fontSize: "var(--size-body-s)", color: "var(--text-body)" }}>
                  <Icon icon={icon} size={18} style={{ color: "var(--text-accent)", marginTop: 2 }} />
                  {label}
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" style={{ background: "var(--surface-sage-soft)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-14 lg:py-[var(--section-y)] flex flex-col gap-10">
          <Reveal>
            <SectionHeading
              eyebrow={c.servicosEyebrow}
              title={c.servicosTitulo}
              description={c.servicosTexto}
              action={
                <Button variant="secondary" href="/vitrine/agendar" style={{ marginTop: "var(--space-8)" }}>
                  {c.servicosBotao}
                </Button>
              }
            />
          </Reveal>
          {services.length === 0 ? (
            <p style={{ font: "var(--type-body)", color: "var(--text-muted)" }}>
              {c.servicosVazio}
            </p>
          ) : (
            <ServiceList
              services={services.map((service) => ({
                id: service.id,
                name: service.name,
                duration: `${service.durationMins} min`,
                price: `a partir de ${formatCurrencyBR(service.price)}`,
                description: service.description,
                sessionDetails: service.sessionDetails,
              }))}
            />
          )}
        </div>
      </section>

      {/* Galeria */}
      <section style={{ background: "var(--surface-page)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-14 lg:py-[var(--section-y)] flex flex-col gap-10">
          <SectionHeading eyebrow={c.galeriaEyebrow} title={c.galeriaTitulo} align="center" />
          {fotos.length > 0 ? (
            <GaleriaFotos fotos={fotos} />
          ) : (
            <div className="relative aspect-[4/5] rounded-[var(--radius-image)] overflow-hidden max-w-[360px] mx-auto w-full" style={{ boxShadow: "var(--shadow-inset-hairline)" }}>
              <Image src={c.imagemGaleria} alt="Humberto Bove aplicando massoterapia" fill className="object-cover" />
            </div>
          )}
          <p style={{ font: "var(--type-caption)", color: "var(--text-muted)", textAlign: "center" }}>
            {c.galeriaLegenda}{" "}
            <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer">
              {c.instagramHandle}
            </a>
          </p>
        </div>
      </section>

      {/* Avaliações (só aparece com avaliações aprovadas) */}
      {avaliacoes.length > 0 && (
        <section
          id="avaliacoes"
          style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)", scrollMarginTop: 80 }}
        >
          <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-14 lg:py-[var(--section-y)] flex flex-col gap-10 min-w-0">
            <SectionHeading
              eyebrow={c.avaliacoesEyebrow}
              title={c.avaliacoesTitulo}
              align="center"
              action={
                <div className="flex flex-col items-center gap-2" style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>
                  <span style={{ font: "var(--type-heading)", color: "var(--text-strong)" }}>
                    {media.toFixed(1).replace(".", ",")}
                  </span>
                  <Estrelas nota={media} tamanho={20} />
                  <span>{totalAvaliacoes === 1 ? "1 avaliação no Google" : `${totalAvaliacoes} avaliações no Google`}</span>
                </div>
              }
            />
            {avaliacoes.length >= 3 ? (
              <AvaliacoesLoop rotulo="Avaliações de clientes" itens={itensAvaliacoes} />
            ) : (
              <Carrossel
                rotulo="Avaliações de clientes"
                porTela={{ celular: 1.05, tablet: 2, desktop: 3 }}
                itens={itensAvaliacoes}
              />
            )}
            {linkGoogle && (
              <div className="flex justify-center">
                <Button variant="secondary" href={linkGoogle} target="_blank" rel="noopener noreferrer" iconRight={<Icon icon={ExternalLink} size={16} />}>
                  Ver todas no Google
                </Button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer id="contato" style={{ background: "var(--surface-inverse)", color: "var(--text-inverse)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-12 lg:py-[var(--section-y-compact)] grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-[var(--space-40)]">
          <Wordmark tone="inverse" nome={c.nomeProfissional} espaco={c.nomeEspaco} />
          <div className="flex flex-col gap-2" style={{ font: "var(--type-caption)", color: "rgba(255,253,251,.72)" }}>
            <span style={{ color: "var(--linen-0)" }}>{c.rodapeConsultorio}</span>
            <span>{c.endereco}</span>
            <span>{c.horarioAtendimento}</span>
          </div>
          <div className="flex flex-col gap-2" style={{ font: "var(--type-caption)", color: "rgba(255,253,251,.72)" }}>
            <span style={{ color: "var(--linen-0)" }}>{c.rodapeContato}</span>
            <a href={whatsappLink(whatsappMessage, c.telefoneWhatsapp)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2" style={{ color: "inherit" }}>
              <Icon icon={MessageCircle} size={14} />
              {c.telefoneExibicao}
            </a>
            <a href={c.mapaUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2" style={{ color: "inherit" }}>
              <Icon icon={MapPin} size={14} />
              {c.rodapeComoChegar}
            </a>
            <a href={c.instagramUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2" style={{ color: "inherit" }}>
              <Icon icon={AtSign} size={14} />
              {c.instagramHandle}
            </a>
          </div>
        </div>
        <div
          className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-5"
          style={{ borderTop: "1px solid rgba(255,253,251,.12)", font: "var(--type-caption)", color: "rgba(255,253,251,.5)" }}
        >
          {c.rodapeTexto}
        </div>
      </footer>
    </div>
  );
}
