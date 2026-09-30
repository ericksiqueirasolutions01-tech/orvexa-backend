// GET /api/meus-pedidos?email=cliente@exemplo.com
// Consulta todos os acessos e produtos comprados pelo cliente usando o e-mail da compra.
const { isValidEmail, PRODUCTS } = require("../lib/products");
const { getSalesHistory } = require("../lib/store");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  try {
    const rawEmail = req.query.email || "";
    const email = String(rawEmail).trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({ ok: false, error: "Informe um e-mail válido para consultar seus acessos." });
    }

    const sales = await getSalesHistory();
    const compras = sales
      .filter((s) => String(s.email || "").trim().toLowerCase() === email)
      .map((s) => {
        const prodInfo = PRODUCTS[s.produto] || { title: s.produto_nome || s.produto, short: s.produto };
        return {
          id: s.id,
          order_nsu: s.order_nsu,
          produto: s.produto,
          produto_nome: prodInfo.title,
          data: s.data,
          status: s.status,
          valor: s.valor,
          conta_entregue: s.conta_entregue,
        };
      });

    return res.status(200).json({
      ok: true,
      email,
      total: compras.length,
      compras,
    });
  } catch (e) {
    console.error("Erro em /api/meus-pedidos:", e.message);
    return res.status(500).json({ ok: false, error: "Erro ao consultar pedidos. Tente novamente." });
  }
};
