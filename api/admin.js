// Painel de controle de estoque e vendas — Protegido por ADMIN_TOKEN
const { PRODUCTS, ADMIN_TOKEN } = require("../lib/products");
const {
  pushStockAccounts,
  stockCount,
  getAllStockCounts,
  getStockAccounts,
  removeStockAccount,
  getSalesHistory,
  recordSale,
} = require("../lib/store");

function authorized(req) {
  const headers = req.headers || {};
  const authHeader = headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const query = req.query || {};
  const body = req.body || {};
  const token = query.token || body.token || bearerToken;
  return Boolean(ADMIN_TOKEN) && token === ADMIN_TOKEN;
}

module.exports = async function handler(req, res) {
  if (!authorized(req)) {
    return res.status(401).json({ error: "Acesso não autorizado. Informe o ADMIN_TOKEN correto." });
  }

  try {
    // GET: Retorna visão geral de estoques e vendas, ou lista de itens de um produto específico
    if (req.method === "GET") {
      const produto = req.query.produto;
      if (produto && PRODUCTS[produto]) {
        const items = await getStockAccounts(produto);
        return res.status(200).json({ ok: true, produto, items, count: items.length });
      }

      const stocks = await getAllStockCounts();
      const vendas = await getSalesHistory();
      const faturamentoTotal = vendas.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
      const estoqueTotal = Object.values(stocks).reduce((sum, c) => sum + (Number(c) || 0), 0);

      return res.status(200).json({
        ok: true,
        stocks,
        produtos: PRODUCTS,
        vendas,
        resumo: {
          total_vendas: vendas.length,
          faturamento_total: faturamentoTotal,
          estoque_total: estoqueTotal,
        },
      });
    }

    // POST: Ações de cadastro, remoção, teste de venda e consulta
    if (req.method === "POST") {
      const body = req.body || {};
      const action = body.action || "add_stock";
      const produto = body.produto || "muse-ia";

      if (!PRODUCTS[produto] && action !== "config" && action !== "test_sale") {
        return res.status(400).json({ error: `Produto inválido: ${produto}` });
      }

      if (action === "add_stock") {
        let clean = [];
        if (produto === "muse-ia") {
          const rawAccounts = body.accounts || body.items || [];
          clean = (Array.isArray(rawAccounts) ? rawAccounts : [])
            .map((a) => {
              if (typeof a === "string") {
                const [login, senha] = a.split(";");
                return { login: (login || "").trim(), senha: (senha || "").trim() };
              }
              return { login: (a.login || "").trim(), senha: (a.senha || "").trim() };
            })
            .filter((a) => a.login && a.senha);

          if (!clean.length) {
            return res.status(400).json({ error: "Envie contas no formato login;senha." });
          }
        } else {
          // flow-ai-pro (Gemini Pro) ou super-duolingo
          const rawLinks = body.links || body.items || body.accounts || [];
          clean = (Array.isArray(rawLinks) ? rawLinks : [])
            .map((item) => {
              if (typeof item === "string") {
                return { link: item.trim() };
              }
              const link = item.link || item.activation_link || item.invite_link || item.url;
              return link ? { link: String(link).trim() } : null;
            })
            .filter((item) => item && item.link && item.link.startsWith("http"));

          if (!clean.length) {
            return res.status(400).json({ error: "Envie pelo menos um link válido iniciando com http." });
          }
        }

        const added = await pushStockAccounts(clean, produto);
        const atual = await stockCount(produto);
        return res.status(200).json({
          ok: true,
          produto,
          adicionadas: added,
          estoque_atual: atual,
        });
      }

      if (action === "remove_stock") {
        const index = parseInt(body.index, 10);
        if (isNaN(index)) {
          return res.status(400).json({ error: "Índice do item inválido." });
        }
        const removed = await removeStockAccount(index, produto);
        const atual = await stockCount(produto);
        return res.status(200).json({
          ok: true,
          removido: removed,
          estoque_atual: atual,
        });
      }

      if (action === "get_items") {
        const items = await getStockAccounts(produto);
        return res.status(200).json({ ok: true, produto, items, count: items.length });
      }

      if (action === "test_sale") {
        const prodKey = body.produto || "muse-ia";
        const prodInfo = PRODUCTS[prodKey] || PRODUCTS["muse-ia"];
        let testAccount = "exemplo.teste@cliente.com;senha123";

        if (prodKey === "flow-ai-pro") {
          testAccount = "https://one.google.com/promo/claim?token=TESTE-GEMINI-PRO-18M";
        } else if (prodKey === "super-duolingo") {
          testAccount = "https://www.duolingo.com/super/redeem?token=TESTE-SUPER-DUO-1Y";
        }

        const testSale = {
          id: `sale-test-${Date.now()}`,
          order_nsu: `${prodKey}-test-${Date.now().toString(36)}`,
          transaction_nsu: `tx-${Math.floor(100000 + Math.random() * 900000)}`,
          email: body.email || "cliente.teste@exemplo.com",
          produto: prodKey,
          produto_nome: prodInfo.title,
          valor: prodInfo.priceBRL,
          conta_entregue: testAccount,
          data: new Date().toISOString(),
          status: "pago",
          is_test: true,
        };

        await recordSale(testSale);
        return res.status(200).json({ ok: true, message: "Venda de teste simulada com sucesso!", sale: testSale });
      }

      return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }

    return res.status(405).json({ error: "Método não permitido. Use GET ou POST." });
  } catch (e) {
    console.error("Erro no api/admin:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
