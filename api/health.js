// GET /api/health — verificação rápida de que o backend está no ar e o banco de dados está ativo.
const { PRODUCTS, INFINITEPAY_HANDLE } = require("../lib/products");
const { hasKv, hasCloudDb } = require("../lib/store");

module.exports = async function handler(req, res) {
  const kvOk = hasKv();
  const cloudDbOk = hasCloudDb();
  res.status(200).json({
    ok: true,
    gateway: "infinitepay",
    handle_configurado: Boolean(INFINITEPAY_HANDLE),
    kv_configurado: kvOk || cloudDbOk,
    banco_em_nuvem: cloudDbOk,
    vercel_kv: kvOk,
    produtos: ["muse-ia", "flow-ai-pro"],
  });
};
