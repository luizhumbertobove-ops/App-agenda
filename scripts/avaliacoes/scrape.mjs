// Scraper diário das avaliações do Google Maps.
// Abre a página do lugar com Playwright, lê as avaliações e envia para a API do app.
//
// Variáveis de ambiente:
//   GOOGLE_MAPS_URL  (obrigatória) link da página do lugar no Google Maps
//   APP_URL          URL base do app (ex.: https://exemplo.com.br) — obrigatória sem DRY_RUN
//   CRON_SECRET      segredo do endpoint de importação — obrigatório sem DRY_RUN
//   MAX_REVIEWS      quantas avaliações ler (padrão 100, máximo 500)
//   DRY_RUN          "1" → só imprime o JSON e não envia

import { chromium } from "playwright";

// Seletores do Google Maps. O Google muda as classes com frequência:
// quando a extração quebrar, é aqui que se ajusta.
const SELETORES = {
  consentimento: 'button:has-text("Aceitar tudo"), button:has-text("Accept all")',
  linkDoLugar: 'a[href*="/maps/place/"]',
  abaAvaliacoes: 'button[role="tab"]',
  textoAbaAvaliacoes: /Avaliações|Reviews/,
  cardAvaliacao: "div[data-review-id]",
  botaoOrdenar: 'button[aria-label*="Classificar"], button[aria-label*="Sort"]',
  itemMaisRecentes: '[role="menuitemradio"]',
  textoMaisRecentes: /Mais recentes|Newest/,
  botoesMais: 'button.w8nwRe, button[aria-label="Ver mais"]',
  autor: ".d4r55",
  estrelas: 'span[role="img"][aria-label*="estrela"]',
  texto: ".wiI7pd",
  dataRelativa: ".rsqaWe",
};

const UA_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const log = (...a) => console.error(...a);
const aviso = (...a) => console.warn("[aviso]", ...a);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

function lerConfig() {
  const dryRun = process.env.DRY_RUN === "1";
  const googleUrl = (process.env.GOOGLE_MAPS_URL || "").trim();
  if (!googleUrl) {
    console.error("Erro: defina GOOGLE_MAPS_URL com o link da página do lugar no Google Maps.");
    process.exit(1);
  }
  const appUrl = (process.env.APP_URL || "").trim();
  const cronSecret = (process.env.CRON_SECRET || "").trim();
  if (!dryRun && (!appUrl || !cronSecret)) {
    console.error("Erro: APP_URL e CRON_SECRET são obrigatórios (sem DRY_RUN=1).");
    process.exit(1);
  }
  let maxReviews = Number.parseInt(process.env.MAX_REVIEWS || "100", 10);
  if (!Number.isFinite(maxReviews) || maxReviews < 1) maxReviews = 100;
  maxReviews = Math.min(maxReviews, 500);
  return { dryRun, googleUrl, appUrl, cronSecret, maxReviews };
}

async function aceitarConsentimento(page) {
  try {
    const botao = page.locator(SELETORES.consentimento).first();
    if (await botao.isVisible({ timeout: 4000 })) {
      await botao.click();
      log("Tela de consentimento aceita.");
      await page.waitForLoadState("domcontentloaded");
    }
  } catch {
    // Sem tela de consentimento: segue.
  }
}

// Sem login, o Google às vezes abre um aviso "Faça login..." por cima da lista. Fecha antes de seguir.
async function fecharAvisos(page) {
  try {
    await page.evaluate(() => {
      for (const d of document.querySelectorAll('[role="dialog"]')) {
        if (!/Faça login/i.test(d.innerText || "")) continue;
        const fechar = [...d.querySelectorAll("button")].find((b) => /Fechar|Close/i.test(b.getAttribute("aria-label") || b.innerText || ""));
        if (fechar) fechar.click();
      }
    });
    await page.keyboard.press("Escape");
    await esperar(500);
  } catch {
    // Sem aviso: segue.
  }
}

async function abrirAbaAvaliacoes(page) {
  const aba = page
    .locator(SELETORES.abaAvaliacoes)
    .filter({ hasText: SELETORES.textoAbaAvaliacoes })
    .first();
  await aba.click({ timeout: 30000 });
}

async function ordenarMaisRecentes(page) {
  try {
    await page.locator(SELETORES.botaoOrdenar).first().click({ timeout: 8000 });
    await page
      .locator(SELETORES.itemMaisRecentes)
      .filter({ hasText: SELETORES.textoMaisRecentes })
      .first()
      .click({ timeout: 8000 });
    await esperar(1200);
    log("Avaliações ordenadas por mais recentes.");
  } catch {
    aviso("Não consegui ordenar por mais recentes; seguindo na ordem padrão.");
  }
}

// Marca o painel rolável das avaliações e devolve quantos cards únicos existem.
async function marcarPainel(page) {
  return page.evaluate((card) => {
    const primeiro = document.querySelector(card);
    if (!primeiro) return false;
    let el = primeiro.parentElement;
    while (el) {
      const estilo = getComputedStyle(el);
      if (el.scrollHeight > el.clientHeight + 10 && /(auto|scroll)/.test(estilo.overflowY)) {
        el.setAttribute("data-scrape-painel", "1");
        return true;
      }
      el = el.parentElement;
    }
    return false;
  }, SELETORES.cardAvaliacao);
}

// A lista do Google é virtualizada: só os cards visíveis ficam no DOM. Por isso a cada
// rolagem lê-se o que está na tela e acumula por externalId, em vez de contar no fim.
async function coletarAvaliacoes(page, maxReviews) {
  const temPainel = await marcarPainel(page);
  if (!temPainel) aviso("Painel rolável não encontrado; lendo só o que já está carregado.");

  const mapa = new Map();
  let semNovos = 0;
  for (let i = 0; i < 60 && mapa.size < maxReviews && semNovos < 3; i++) {
    await expandirTextos(page);
    const antes = mapa.size;
    for (const r of await extrair(page)) {
      if (!mapa.has(r.externalId)) mapa.set(r.externalId, r);
    }
    semNovos = mapa.size > antes ? 0 : semNovos + 1;
    if (mapa.size >= maxReviews) break;

    await page.evaluate(() => {
      const painel = document.querySelector('[data-scrape-painel="1"]');
      if (painel) painel.scrollTop += painel.clientHeight * 0.8;
    });
    await esperar(1200);
  }
  log(`Avaliações lidas: ${mapa.size}.`);
  return [...mapa.values()];
}

async function expandirTextos(page) {
  // Clique pelo DOM: o clique do Playwright costuma falhar nesses botões (sobreposição/animação).
  const total = await page.evaluate(
    (S) => {
      const botoes = document.querySelectorAll(`${S.cardAvaliacao} :is(${S.botoesMais})`);
      botoes.forEach((b) => b.click());
      return botoes.length;
    },
    SELETORES
  );
  if (total > 0) await esperar(500);
}

async function extrair(page) {
  return page.evaluate((S) => {
    const vistos = new Map();
    for (const card of document.querySelectorAll(S.cardAvaliacao)) {
      const id = card.dataset.reviewId;
      if (!id) continue;
      // Mesmo id aparece em elementos aninhados: fica com o primeiro (mais externo) que tenha autor.
      const atual = vistos.get(id);
      const temAutor = !!card.querySelector(S.autor);
      if (atual && (atual.temAutor || !temAutor)) continue;
      vistos.set(id, { card, temAutor });
    }

    const reviews = [];
    for (const [externalId, { card }] of vistos) {
      const autorEl = card.querySelector(S.autor);
      const author = (autorEl?.textContent || card.getAttribute("aria-label") || "").trim();

      const estrelasEl = card.querySelector(S.estrelas);
      const m = estrelasEl?.getAttribute("aria-label")?.match(/(\d)/);
      const rating = m ? Number.parseInt(m[1], 10) : NaN;

      const text = (card.querySelector(S.texto)?.textContent || "").trim();

      let relativeDate = (card.querySelector(S.dataRelativa)?.textContent || "").trim();
      if (!relativeDate) {
        const d = (card.innerText || "").match(/há [^\n·]+/i);
        relativeDate = d ? d[0].trim() : "";
      }

      if (!author || !(rating >= 1 && rating <= 5)) continue;
      reviews.push({ externalId, author, rating, text, relativeDate });
    }
    return reviews;
  }, SELETORES);
}

async function enviar(appUrl, cronSecret, reviews) {
  const url = `${appUrl.replace(/\/$/, "")}/api/avaliacoes/importar`;
  const resposta = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cronSecret}`,
    },
    body: JSON.stringify({ reviews }),
  });
  const corpo = await resposta.text();
  log(`Resposta da API (${resposta.status}): ${corpo}`);
  if (!resposta.ok) {
    console.error("Erro: a API recusou a importação.");
    process.exit(1);
  }
}

async function main() {
  const { dryRun, googleUrl, appUrl, cronSecret, maxReviews } = lerConfig();

  const url = new URL(googleUrl);
  url.searchParams.set("hl", "pt-BR");

  const browser = await chromium.launch({ headless: true });
  let reviews = [];
  try {
    const context = await browser.newContext({
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1280, height: 900 },
      userAgent: UA_CHROME,
    });
    const page = await context.newPage();

    log("Abrindo a página do lugar…");
    await page.goto(url.toString(), { waitUntil: "domcontentloaded", timeout: 60000 });
    await aceitarConsentimento(page);

    // Se a URL de busca cair numa lista de resultados, entra no primeiro lugar.
    try {
      await page.waitForSelector(`${SELETORES.abaAvaliacoes}, ${SELETORES.linkDoLugar}`, { timeout: 20000 });
      const temAba = await page
        .locator(SELETORES.abaAvaliacoes)
        .filter({ hasText: SELETORES.textoAbaAvaliacoes })
        .count();
      if (!temAba && (await page.locator(SELETORES.linkDoLugar).count()) > 0) {
        log("A busca mostrou uma lista; abrindo o primeiro resultado.");
        await page.locator(SELETORES.linkDoLugar).first().click();
        await page.waitForLoadState("domcontentloaded");
        await esperar(2000);
      }
    } catch {
      // Segue; a aba de avaliações é verificada abaixo.
    }

    await abrirAbaAvaliacoes(page);
    await page.waitForSelector(SELETORES.cardAvaliacao, { timeout: 30000 });
    log("Aba de avaliações aberta.");
    await fecharAvisos(page);

    await ordenarMaisRecentes(page);
    reviews = (await coletarAvaliacoes(page, maxReviews)).slice(0, maxReviews);

    if (reviews.length === 0) {
      console.error("Erro: nenhuma avaliação extraída. Título da página:", JSON.stringify(await page.title()));
      console.error("URL final:", page.url());
      await page.screenshot({ path: "scrape-falhou.png", fullPage: true });
      console.error("Screenshot salvo em scrape-falhou.png.");
      process.exitCode = 1;
      return;
    }
  } finally {
    await browser.close();
  }

  log(`Extraídas ${reviews.length} avaliações.`);
  if (dryRun) {
    console.log(JSON.stringify({ reviews }, null, 2));
    log("DRY_RUN=1: nada foi enviado.");
    return;
  }
  await enviar(appUrl, cronSecret, reviews);
}

main().catch((erro) => {
  console.error("Erro no scraper:", erro.message);
  process.exit(1);
});
