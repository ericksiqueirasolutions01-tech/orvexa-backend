// Catálogo de produtos e constantes compartilhadas.
const PRODUCTS = {
  "muse-ia": {
    title: "MUSE IA — acesso completo",
    short: "MUSE IA",
    priceBRL: 79.99,
    priceCents: 7999,
    delivery: "stock",
    itemType: "account",
  },
  "flow-ai-pro": {
    title: "Google Flow + Google AI Pro — 18 meses",
    short: "Gemini AI Pro 18m",
    priceBRL: 49.99,
    priceCents: 4999,
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
const PUBLIC_URL = (process.env.PUBLIC_URL || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://orvexa-backend.vercel.app"))).replace(/\/$/, "");
const SITE_URL = (process.env.SITE_URL || PUBLIC_URL).replace(/\/$/, "");
const WHATSAPP_URL = process.env.WHATSAPP_URL || "https://wa.me/5521992936790";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ericksiqueiraa@gmail.com";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "17062b95c8693938bb1e10799b4b6fc5";
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";
const YOUTUBE_TUTORIAL_FLOW = "https://www.youtube.com/shorts/6yournVyUWI";

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
  SITE_URL,
  WHATSAPP_URL,
  ADMIN_EMAIL,
  ADMIN_TOKEN,
  FROM_EMAIL,
  YOUTUBE_TUTORIAL_FLOW,
  isValidEmail,
  newOrderNsu,
};
