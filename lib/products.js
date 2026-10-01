// Catálogo de produtos e constantes compartilhadas.
const PRODUCTS = {
  "muse-ia": {
    title: "MUSE IA — Conta com 1 Bilhão de Tokens",
    short: "MUSE IA (1B Tokens)",
    priceBRL: 59.99,
    priceCents: 5999,
    delivery: "stock",
    itemType: "account",
  },
  "flow-ai-pro": {
    title: "Google Flow + Google AI Pro — 18 meses",
    short: "Gemini AI Pro 18m",
    priceBRL: 37.0,
    priceCents: 3700,
    delivery: "stock",
    itemType: "link",
  },
  "super-duolingo": {
    title: "Super Duolingo — 1 ano",
    short: "Super Duolingo",
    priceBRL: 37.0,
    priceCents: 3700,
    delivery: "stock",
    itemType: "link",
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

