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
    const comprasMap = new Map();

    sales
      .filter((s) => String(s.email || "").trim().toLowerCase() === email)
      .forEach((s) => {
        const prodInfo = PRODUCTS[s.produto] || { title: s.produto_nome || s.produto, short: s.produto };
        comprasMap.set(s.order_nsu, {
          id: s.id,
          order_nsu: s.order_nsu,
          produto: s.produto,
          produto_nome: prodInfo.title,
          data: s.data,
          status: s.status,
          valor: s.valor,
          conta_entregue: s.conta_entregue,
        });
      });

    // Também verifica pedidos pendentes ou em processamento
    let pendentes = [];
    try {
      const { getPendingOrders } = require("../lib/store");
      const pendingList = await getPendingOrders();
      pendentes = pendingList
        .filter((o) => String(o.email || "").trim().toLowerCase() === email)
        .map((o) => {
          const prodInfo = PRODUCTS[o.produto] || { title: o.produto, short: o.produto };
          return {
            order_nsu: o.order_nsu,
            produto: o.produto,
            produto_nome: prodInfo.title,
            created_at: o.created_at,
            status: "aguardando_aprovacao",
            mensagem: "Pagamento via Pix em verificação. Se já realizou o Pix, a liberação ocorre em instantes.",
          };
        });
    } catch (ePend) {
      console.warn("Aviso ao buscar pedidos pendentes em meus-pedidos:", ePend.message);
    }

    const compras = Array.from(comprasMap.values());

    return res.status(200).json({
      ok: true,
      email,
      total: compras.length,
      compras,
      pendentes,
    });
  } catch (e) {
    console.error("Erro em /api/meus-pedidos:", e.message);
    return res.status(500).json({ ok: false, error: "Erro ao consultar pedidos. Tente novamente." });
  }
};
