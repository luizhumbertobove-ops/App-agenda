import "./bove-ds.css";

export const revalidate = 300;

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
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
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatCurrencyBR } from "@/lib/format";
import {
  BETO_PHONE_DISPLAY,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
  ADDRESS,
  MAPS_URL,
  whatsappLink,
} from "@/lib/vitrine";
import { Button } from "@/components/vitrine/ds/Button";
import { SectionHeading } from "@/components/vitrine/ds/SectionHeading";
import { ServiceCard } from "@/components/vitrine/ds/ServiceCard";
import { Icon } from "@/components/vitrine/ds/Icon";

export const metadata: Metadata = {
  title: "Humberto Bove — Massoterapeuta | Spaço Lhum",
  description:
    "Massoterapia em Serrana/SP. Agende seu horário com Humberto Bove (Spaço Lhum) pelo WhatsApp.",
};

const BENEFITS = [
  { icon: HandHeart, label: "Alivia tensões e dores musculares" },
  { icon: Sparkles, label: "Reduz o estresse e a ansiedade" },
  { icon: Droplets, label: "Melhora a circulação sanguínea" },
  { icon: Zap, label: "Aumenta a disposição e o bem-estar" },
  { icon: Wind, label: "Promove relaxamento profundo" },
  { icon: Moon, label: "Contribui para uma melhor qualidade do sono" },
];

const GALLERY_IMAGE = { src: "/vitrine/sessao.jpg", alt: "Humberto Bove aplicando massoterapia" };

const NAV_LINKS = [
  { href: "#servicos", label: "Serviços" },
  { href: "#sobre", label: "Sobre" },
  { href: "#contato", label: "Contato" },
];

async function getServices() {
  return prisma.service.findMany({
    where: { active: true },
    orderBy: { price: "asc" },
  });
}

function Wordmark({ tone = "default", size = 22 }: { tone?: "default" | "inverse"; size?: number }) {
  const color = tone === "inverse" ? "var(--linen-0)" : "var(--text-strong)";
  const sub = tone === "inverse" ? "rgba(255,253,251,.7)" : "var(--text-muted)";
  const rule = tone === "inverse" ? "rgba(255,253,251,.55)" : "var(--action-primary)";
  return (
    <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 5 }}>
      <span style={{ fontFamily: "var(--font-serif-display)", fontWeight: 300, fontStyle: "italic", fontSize: size, lineHeight: 1, letterSpacing: "-.02em", color }}>
        Humberto Bove
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: size * 1.6, height: 1, background: rule, flex: "none" }} />
        <span style={{ font: "var(--type-eyebrow)", letterSpacing: "var(--tracking-caps)", textTransform: "uppercase", color: sub }}>
          Spaço Lhum
        </span>
      </span>
    </span>
  );
}

export default async function VitrinePage() {
  const services = await getServices();

  return (
    <div className="bove-ds" style={{ background: "var(--surface-page)", minHeight: "100vh" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b"
        style={{ background: "rgba(250,246,241,.86)", backdropFilter: "var(--overlay-blur)", borderColor: "var(--border-hairline)" }}
      >
        <div className="max-w-[var(--container-max)] mx-auto flex items-center gap-6 lg:gap-10 px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-4">
          <Wordmark />
          <nav className="hidden md:flex gap-8 ml-auto">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} style={{ font: "var(--type-body)", fontSize: "var(--size-body-s)", color: "var(--text-body)" }} className="no-underline">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto md:ml-0">
            <Button variant="primary" size="sm" href="/vitrine/agendar" iconLeft={<Icon icon={CalendarDays} size={16} />}>
              Agendar
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-16 lg:py-[var(--section-y)] grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-10 lg:gap-[var(--space-72)] items-center">
        <div className="flex flex-col gap-6">
          <span className="ds-eyebrow">Massoterapia em Serrana, SP</span>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 60px)", maxWidth: "16ch" }}>Massoterapia que cuida de verdade.</h1>
          <p style={{ font: "var(--type-body-lead)", color: "var(--text-body)", maxWidth: "var(--measure-narrow)" }}>
            Sessões de uma hora, sempre em horário cheio, conduzidas com atenção ao que o seu corpo precisa naquele
            dia. Escolha o serviço e reserve o horário direto por aqui.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="primary" size="lg" href="/vitrine/agendar" iconLeft={<Icon icon={CalendarDays} size={18} />}>
              Agendar horário online
            </Button>
            <Button
              variant="secondary"
              size="lg"
              href={whatsappLink("Olá Humberto, vim pelo site e quero agendar um horário.")}
              target="_blank"
              rel="noopener noreferrer"
              iconLeft={<Icon icon={MessageCircle} size={18} />}
            >
              Falar no WhatsApp
            </Button>
          </div>
          <div className="flex flex-col gap-2 pt-4 border-t" style={{ borderColor: "var(--border-hairline)" }}>
            {(
              [
                { icon: MapPin, text: "Serrana, SP" },
                { icon: Clock, text: "Segunda a sexta, 7h às 19h" },
                { icon: AtSign, text: "spalhum" },
              ] satisfies { icon: typeof MapPin; text: string }[]
            ).map(({ icon, text }) => (
              <span key={text} className="flex items-center gap-2" style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>
                <Icon icon={icon} size={15} />
                {text}
              </span>
            ))}
          </div>
        </div>
        <div className="relative rounded-[var(--radius-image)] overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[520px]" style={{ boxShadow: "var(--shadow-inset-hairline)" }}>
          <Image src="/vitrine/massoterapia.jpg" alt="Sessão de massoterapia no Spaço Lhum" fill className="object-cover" priority />
        </div>
      </section>

      {/* Sobre / missão */}
      <section id="sobre" style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border-hairline)", borderBottom: "1px solid var(--border-hairline)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-14 lg:py-[var(--section-y)] grid grid-cols-1 lg:grid-cols-[.9fr_1.1fr] gap-10 lg:gap-[var(--space-72)] items-center">
          <div className="relative rounded-[var(--radius-image)] overflow-hidden aspect-[4/5] lg:aspect-auto lg:h-[440px] order-2 lg:order-1" style={{ boxShadow: "var(--shadow-inset-hairline)" }}>
            <Image src="/vitrine/missao.jpg" alt="Humberto Bove, massoterapeuta do Spaço Lhum" fill className="object-cover" />
          </div>
          <div className="flex flex-col gap-6 order-1 lg:order-2">
            <SectionHeading
              eyebrow="Sobre"
              title="Minha missão"
              description="Levar autocuidado e alívio de dores físicas e emocionais através das minhas mãos."
            />
            <div className="grid grid-cols-2 gap-4">
              {BENEFITS.map(({ icon, label }) => (
                <span key={label} className="flex items-start gap-3" style={{ font: "var(--type-body)", fontSize: "var(--size-body-s)", color: "var(--text-body)" }}>
                  <Icon icon={icon} size={18} style={{ color: "var(--text-accent)", marginTop: 2 }} />
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section id="servicos" style={{ background: "var(--surface-sage-soft)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-14 lg:py-[var(--section-y)] flex flex-col gap-10">
          <SectionHeading
            eyebrow="Serviços"
            title="O que trabalhamos na sessão"
            description="Sessões de 1 hora, sempre em horário cheio. Valores podem variar em datas especiais ou fora do horário comercial."
            action={
              <Button variant="secondary" href="/vitrine/agendar" style={{ marginTop: "var(--space-8)" }}>
                Agendar sessão
              </Button>
            }
          />
          {services.length === 0 ? (
            <p style={{ font: "var(--type-body)", color: "var(--text-muted)" }}>
              Fale pelo WhatsApp para conhecer os serviços disponíveis.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--space-24)]">
              {services.map((service) => (
                <Link key={service.id} href={`/vitrine/agendar?servico=${service.id}`} className="block h-full">
                  <ServiceCard
                    name={service.name}
                    duration={`${service.durationMins} min`}
                    price={`a partir de ${formatCurrencyBR(service.price)}`}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Galeria */}
      <section style={{ background: "var(--surface-page)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-14 lg:py-[var(--section-y)] flex flex-col gap-10">
          <SectionHeading eyebrow="Galeria" title="No dia a dia do consultório" align="center" />
          <div className="relative aspect-[4/5] rounded-[var(--radius-image)] overflow-hidden max-w-[360px] mx-auto w-full" style={{ boxShadow: "var(--shadow-inset-hairline)" }}>
            <Image src={GALLERY_IMAGE.src} alt={GALLERY_IMAGE.alt} fill className="object-cover" />
          </div>
          <p style={{ font: "var(--type-caption)", color: "var(--text-muted)", textAlign: "center" }}>
            Mais fotos no Instagram{" "}
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer">
              {INSTAGRAM_HANDLE}
            </a>
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer id="contato" style={{ background: "var(--surface-inverse)", color: "var(--text-inverse)" }}>
        <div className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-12 lg:py-[var(--section-y-compact)] grid grid-cols-1 sm:grid-cols-3 gap-8 lg:gap-[var(--space-40)]">
          <Wordmark tone="inverse" />
          <div className="flex flex-col gap-2" style={{ font: "var(--type-caption)", color: "rgba(255,253,251,.72)" }}>
            <span style={{ color: "var(--linen-0)" }}>Consultório</span>
            <span>{ADDRESS}</span>
            <span>Segunda a sexta, 7h às 19h</span>
          </div>
          <div className="flex flex-col gap-2" style={{ font: "var(--type-caption)", color: "rgba(255,253,251,.72)" }}>
            <span style={{ color: "var(--linen-0)" }}>Contato</span>
            <a href={whatsappLink("Olá Humberto, vim pelo site e quero agendar um horário.")} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2" style={{ color: "inherit" }}>
              <Icon icon={MessageCircle} size={14} />
              {BETO_PHONE_DISPLAY}
            </a>
            <a href={MAPS_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2" style={{ color: "inherit" }}>
              <Icon icon={MapPin} size={14} />
              Como chegar
            </a>
            <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2" style={{ color: "inherit" }}>
              <Icon icon={AtSign} size={14} />
              {INSTAGRAM_HANDLE}
            </a>
          </div>
        </div>
        <div
          className="max-w-[var(--container-max)] mx-auto px-[var(--gutter-inline)] lg:px-[var(--gutter-inline-lg)] py-5"
          style={{ borderTop: "1px solid rgba(255,253,251,.12)", font: "var(--type-caption)", color: "rgba(255,253,251,.5)" }}
        >
          Spaço Lhum · Humberto Bove Massoterapia
        </div>
      </footer>
    </div>
  );
}
