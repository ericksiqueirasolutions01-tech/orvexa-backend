// Painel de estoque (protegido por ADMIN_TOKEN).
// GET  /api/admin?token=XXX            → { stock_count, produtos }
// POST /api/admin { token, accounts:[{login, senha}] } → cadastra contas no estoque
const { PRODUCTS, ADMIN_TOKEN } = require("../lib/products");
const { pushStockAccounts, stockCount } = require("../lib/store");

function authorized(req) {
  const token = req.query.token || (req.body || {}).token;
  return Boolean(ADMIN_TOKEN) && token === ADMIN_TOKEN;
}

module.exports = async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ error: "Não autorizado." });
  }

  try {
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        stock_muse_ia: await stockCount(),
        produtos: Object.keys(PRODUCTS),
      });
    }

    if (req.method === "POST") {
      const { accounts } = req.body || {};
      const clean = (Array.isArray(accounts) ? accounts : []).filter((a) => a && a.login && a.senha);
      if (!clean.length) {
        return res.status(400).json({ error: "Envie accounts: [{login, senha}, ...]." });
      }
      const added = await pushStockAccounts(clean);
      return res.status(200).json({ ok: true, adicionadas: added, estoque_atual: await stockCount() });
    }

    return res.status(405).json({ error: "Use GET ou POST." });
  } catch (e) {
    console.error("Erro no admin:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
