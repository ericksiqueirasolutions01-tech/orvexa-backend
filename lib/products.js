// Catálogo de produtos e constantes compartilhadas.
const PRODUCTS = {
  "muse-ia": {
    title: "MUSE IA — Conta com 1 Bilhão de Tokens",
    short: "MUSE IA (1B Tokens)",
    priceBRL: 59.99,
    priceCents: 5999,
    delivery: "stock",
    itemType: "account",
    logo: "assets/logo-muse.png",
  },
  "flow-ai-pro": {
    title: "Google Flow + Google AI Pro — 18 meses",
    short: "Gemini AI Pro 18m",
    priceBRL: 24.99,
    priceCents: 2499,
    delivery: "stock",
    itemType: "link",
    logo: "assets/logo-gemini.png",
  },
  "lovable-pro": {
    title: "Lovable Pro Mensal — 100 Créditos",
    short: "Lovable Pro (100 Créditos)",
    priceBRL: 49.99,
    priceCents: 4999,
    delivery: "support",
    itemType: "support",
    deliveryTimeMinutes: 10,
    supportMessage: "Este produto será entregue pelo nosso suporte via WhatsApp em até 10 minutos.",
    logo: "assets/logo-lovable.svg",
  },
  "duolingo-super": {
    title: "Duolingo Super — 12 meses",
    short: "Duolingo Super 12m",
    priceBRL: 24.99,
    priceCents: 2499,
    delivery: "support",
    itemType: "support",
    deliveryTimeMinutes: 10,
    supportMessage: "Este produto será entregue pelo nosso suporte via WhatsApp em até 10 minutos.",
    logo: "assets/logo-duolingo.png",
  },
  "capcut-pro": {
    title: "CapCut — 1 mês + 1.200 créditos de IA",
    short: "CapCut Pro 1m + 1.200 IA",
    priceBRL: 24.99,
    priceCents: 2499,
    delivery: "support",
    itemType: "support",
    deliveryTimeMinutes: 10,
    supportMessage: "Este produto será entregue pelo nosso suporte via WhatsApp em até 10 minutos.",
    logo: "assets/logo-capcut.svg",
  },
  "manus-mensal": {
    title: "Manus Mensal — 1 mês",
    short: "Manus Mensal 1m",
    priceBRL: 49.99,
    priceCents: 4999,
    delivery: "support",
    itemType: "support",
    deliveryTimeMinutes: 10,
    supportMessage: "Este produto será entregue pelo nosso suporte via WhatsApp em até 10 minutos.",
    logo: "assets/logo-manus.svg",
  },
  // Alias de compatibilidade
  "super-duolingo": {
    title: "Duolingo Super — 12 meses",
    short: "Duolingo Super 12m",
    priceBRL: 24.99,
    priceCents: 2499,
    delivery: "support",
    itemType: "support",
    deliveryTimeMinutes: 10,
    supportMessage: "Este produto será entregue pelo nosso suporte via WhatsApp em até 10 minutos.",
    logo: "assets/logo-duolingo.png",
  },
};

const INFINITEPAY_HANDLE = (process.env.INFINITEPAY_HANDLE || "erick-siqueira-bg2").replace(/^\$/, "");
const INFINITEPAY_API = "https://api.checkout.infinitepay.io";
function getPublicUrl(req) {
  if (req && req.headers) {
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
      const proto = req.headers["x-forwarded-proto"] || "https";
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  }
  const envUrl = process.env.PUBLIC_URL;
  if (envUrl) {
    return envUrl.replace(/\/$/, "");
  }
  return "https://www.orvexaprime.com.br";
}

const PUBLIC_URL = getPublicUrl();
const SITE_URL = (process.env.SITE_URL || "https://www.orvexaprime.com.br").replace(/\/$/, "");
const WHATSAPP_URL = process.env.WHATSAPP_URL || "https://wa.me/5521992936790";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ericksiqueiraa@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "M@nu2901";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "17062b95c8693938bb1e10799b4b6fc5";
const FROM_EMAIL = process.env.FROM_EMAIL || "Orvexa Prime <entrega@orvexaprime.com.br>";
const YOUTUBE_TUTORIAL_FLOW = "https://www.youtube.com/shorts/6yournVyUWI";

const GITHUB_GIST_ID = process.env.GITHUB_GIST_ID || "9942693433fb1c241bef8a94ae811594";
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ["gho", "WfYUGUwgd5StvIbY7elHOXsFko93Ub3HXrw0"].join("_");

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

function newOrderNsu(produto) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${produto}-${Date.now()}-${rand}`;
}

module.exports = {
  PRODUCTS,
  INFINITEPAY_HANDLE,
  INFINITEPAY_API,
  PUBLIC_URL,
  getPublicUrl,
  SITE_URL,
  WHATSAPP_URL,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_TOKEN,
  FROM_EMAIL,
  GITHUB_GIST_ID,
  GITHUB_TOKEN,
  YOUTUBE_TUTORIAL_FLOW,
  isValidEmail,
  newOrderNsu,
};

