import { prisma } from "@/lib/prisma";
import {
  ADDRESS,
  BETO_PHONE,
  BETO_PHONE_DISPLAY,
  INSTAGRAM_HANDLE,
  INSTAGRAM_URL,
} from "@/lib/vitrine";

export type CampoVitrine = {
  readonly key: string;
  readonly label: string;
  readonly section: string;
  readonly type: "text" | "textarea" | "image";
  readonly default: string;
};

/**
 * Catálogo do conteúdo editável da vitrine. A ordem daqui é a ordem do formulário.
 * Os `default` são os valores atuais do código: se o banco não tiver a chave
 * (ou falhar), a vitrine mostra exatamente isto.
 */
const CAMPOS = [
  // Marca
  { key: "nomeProfissional", label: "Nome do profissional", section: "Marca", type: "text", default: "Humberto Bove" },
  { key: "nomeEspaco", label: "Nome do espaço", section: "Marca", type: "text", default: "Spaço Lhum" },

  // Menu do topo
  { key: "headerBotaoAgendar", label: "Botão Agendar (cabeçalho)", section: "Menu", type: "text", default: "Agendar" },
  { key: "menuServicos", label: "Link Serviços", section: "Menu", type: "text", default: "Serviços" },
  { key: "menuSobre", label: "Link Sobre", section: "Menu", type: "text", default: "Sobre" },
  { key: "menuContato", label: "Link Contato", section: "Menu", type: "text", default: "Contato" },

  // Topo (hero)
  { key: "heroEyebrow", label: "Selo acima do título", section: "Topo", type: "text", default: "Massoterapeuta em Serrana, SP" },
  { key: "heroTitulo", label: "Título principal", section: "Topo", type: "text", default: "Massoterapia que cuida de verdade." },
  {
    key: "heroTexto",
    label: "Texto de apresentação",
    section: "Topo",
    type: "textarea",
    default:
      "Sessões de uma hora, sempre em horário cheio, conduzidas com atenção ao que o seu corpo precisa naquele dia. Escolha o serviço e reserve o horário direto por aqui.",
  },
  { key: "heroBotaoAgendar", label: "Botão Agendar horário online", section: "Topo", type: "text", default: "Agendar horário online" },
  { key: "heroBotaoWhatsapp", label: "Botão Falar no WhatsApp", section: "Topo", type: "text", default: "Falar no WhatsApp" },
  { key: "heroCidade", label: "Cidade (linha abaixo do texto)", section: "Topo", type: "text", default: "Serrana, SP" },
  { key: "heroInstagram", label: "Instagram (linha abaixo do texto, sem @)", section: "Topo", type: "text", default: "spalhum" },

  // Sobre
  { key: "sobreEyebrow", label: "Selo da seção", section: "Sobre", type: "text", default: "Sobre" },
  { key: "sobreTitulo", label: "Título da seção", section: "Sobre", type: "text", default: "Minha missão" },
  {
    key: "sobreTexto",
    label: "Texto da seção",
    section: "Sobre",
    type: "textarea",
    default: "Levar autocuidado e alívio de dores físicas e emocionais através das minhas mãos.",
  },
  { key: "beneficio1", label: "Benefício 1", section: "Sobre", type: "text", default: "Alivia tensões e dores musculares" },
  { key: "beneficio2", label: "Benefício 2", section: "Sobre", type: "text", default: "Reduz o estresse e a ansiedade" },
  { key: "beneficio3", label: "Benefício 3", section: "Sobre", type: "text", default: "Melhora a circulação sanguínea" },
  { key: "beneficio4", label: "Benefício 4", section: "Sobre", type: "text", default: "Aumenta a disposição e o bem-estar" },
  { key: "beneficio5", label: "Benefício 5", section: "Sobre", type: "text", default: "Promove relaxamento profundo" },
  { key: "beneficio6", label: "Benefício 6", section: "Sobre", type: "text", default: "Contribui para uma melhor qualidade do sono" },

  // Serviços
  { key: "servicosEyebrow", label: "Selo da seção", section: "Serviços", type: "text", default: "Serviços" },
  { key: "servicosTitulo", label: "Título da seção", section: "Serviços", type: "text", default: "O que trabalhamos na sessão" },
  {
    key: "servicosTexto",
    label: "Texto da seção",
    section: "Serviços",
    type: "textarea",
    default:
      "Sessões de 1 hora, sempre em horário cheio. Valores podem variar em datas especiais ou fora do horário comercial.",
  },
  { key: "servicosBotao", label: "Botão Agendar sessão", section: "Serviços", type: "text", default: "Agendar sessão" },
  {
    key: "servicosVazio",
    label: "Mensagem quando não há serviços",
    section: "Serviços",
    type: "textarea",
    default: "Fale pelo WhatsApp para conhecer os serviços disponíveis.",
  },

  // Galeria
  { key: "galeriaEyebrow", label: "Selo da seção", section: "Galeria", type: "text", default: "Galeria" },
  { key: "galeriaTitulo", label: "Título da seção", section: "Galeria", type: "text", default: "No dia a dia do consultório" },
  { key: "galeriaLegenda", label: "Texto antes do link do Instagram", section: "Galeria", type: "text", default: "Mais fotos no Instagram" },

  // Contato
  {
    key: "telefoneWhatsapp",
    label: "Número do WhatsApp (só números, com DDI 55)",
    section: "Contato",
    type: "text",
    default: BETO_PHONE,
  },
  { key: "telefoneExibicao", label: "Telefone exibido no rodapé", section: "Contato", type: "text", default: BETO_PHONE_DISPLAY },
  { key: "instagramHandle", label: "Instagram (com @)", section: "Contato", type: "text", default: INSTAGRAM_HANDLE },
  { key: "instagramUrl", label: "Link do Instagram", section: "Contato", type: "text", default: INSTAGRAM_URL },
  { key: "endereco", label: "Endereço", section: "Contato", type: "text", default: ADDRESS },
  { key: "horarioAtendimento", label: "Horário de atendimento", section: "Contato", type: "text", default: "Segunda a sexta, 7h às 19h" },

  // Rodapé
  { key: "rodapeConsultorio", label: "Título da coluna do endereço", section: "Rodapé", type: "text", default: "Consultório" },
  { key: "rodapeContato", label: "Título da coluna de contato", section: "Rodapé", type: "text", default: "Contato" },
  { key: "rodapeComoChegar", label: "Link do mapa", section: "Rodapé", type: "text", default: "Como chegar" },
  { key: "rodapeTexto", label: "Linha final", section: "Rodapé", type: "text", default: "Spaço Lhum · Humberto Bove Massoterapeuta" },

  // Imagens
  { key: "imagemTopo", label: "Foto do topo", section: "Imagens", type: "image", default: "/vitrine/massoterapia.jpg" },
  { key: "imagemMissao", label: "Foto da seção Sobre", section: "Imagens", type: "image", default: "/vitrine/missao.jpg" },
  { key: "imagemGaleria", label: "Foto da galeria", section: "Imagens", type: "image", default: "/vitrine/sessao.jpg" },
] as const satisfies readonly CampoVitrine[];

export type VitrineKey = (typeof CAMPOS)[number]["key"];

/** Valores de texto e imagem, mais o link do mapa derivado do endereço. */
export type VitrineContent = Record<VitrineKey, string> & { mapaUrl: string };

export const VITRINE_CAMPOS: readonly CampoVitrine[] = CAMPOS;

const CAMPOS_POR_CHAVE = new Map<string, CampoVitrine>(CAMPOS.map((c) => [c.key, c]));

export function vitrineCampo(key: string): CampoVitrine | undefined {
  return CAMPOS_POR_CHAVE.get(key);
}

function valoresPadrao(): Record<VitrineKey, string> {
  return Object.fromEntries(CAMPOS.map((c) => [c.key, c.default])) as Record<VitrineKey, string>;
}

function comDerivados(valores: Record<VitrineKey, string>): VitrineContent {
  return {
    ...valores,
    mapaUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(valores.endereco)}`,
  };
}

/**
 * Conteúdo atual da vitrine (só servidor). Aplica sobre os defaults o que estiver
 * salvo no banco. Se o banco falhar, devolve os defaults: a vitrine nunca quebra.
 */
export async function getVitrineContent(): Promise<VitrineContent> {
  const valores = valoresPadrao();

  try {
    const linhas = await prisma.vitrineContent.findMany();
    for (const linha of linhas) {
      const campo = vitrineCampo(linha.key);
      if (campo && linha.value.trim() !== "") {
        valores[campo.key as VitrineKey] = linha.value;
      }
    }
  } catch (erro) {
    console.error("Falha ao ler o conteúdo da vitrine; usando os textos padrão.", erro);
  }

  return comDerivados(valores);
}
