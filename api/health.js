// GET /api/health — verificação rápida de que o backend está no ar.
const { PRODUCTS, INFINITEPAY_HANDLE } = require("../lib/products");

module.exports = async function handler(req, res) {
  const kvOk = Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
  res.status(200).json({
    ok: true,
    gateway: "infinitepay",
    handle_configurado: Boolean(INFINITEPAY_HANDLE),
    kv_configurado: kvOk,
    produtos: Object.keys(PRODUCTS),
  });
};
