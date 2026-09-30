// Painel Administrativo Orvexa: Estoque, Histórico de Vendas e Notificações
const { PRODUCTS, ADMIN_TOKEN } = require("../lib/products");
const {
  pushStockAccounts,
  stockCount,
  getStockAccounts,
  removeStockAccount,
  getSalesHistory,
  recordSale,
} = require("../lib/store");

function authorized(req) {
  const token = req.query.token || (req.body || {}).token;
  return Boolean(ADMIN_TOKEN) && token === ADMIN_TOKEN;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (!authorized(req)) {
    return res.status(401).json({ error: "Token de acesso inválido." });
  }

  try {
    if (req.method === "GET") {
      const vendas = await getSalesHistory();
      const estoque = await getStockAccounts();
      const count = estoque.length;

      const faturamentoTotal = vendas.reduce((acc, curr) => acc + (Number(curr.valor) || 0), 0);
      const hoje = new Date().toISOString().slice(0, 10);
      const vendasHoje = vendas.filter((v) => (v.data || "").startsWith(hoje)).length;

      return res.status(200).json({
        ok: true,
        stock_muse_ia: count,
        contas_estoque: estoque,
        vendas,
        produtos: PRODUCTS,
        resumo: {
          total_vendas: vendas.length,
          faturamento_total: faturamentoTotal,
          vendas_hoje: vendasHoje,
          estoque_muse: count,
        },
      });
    }

    if (req.method === "POST") {
      const { action, accounts, index, notify_phone, callmebot_key, webhook_url } = req.body || {};

      // 1. Cadastrar contas no estoque
      if (!action || action === "add_stock") {
        const clean = (Array.isArray(accounts) ? accounts : []).filter((a) => a && a.login && a.senha);
        if (!clean.length) {
          return res.status(400).json({ error: "Envie accounts: [{login, senha}, ...]." });
        }
        const added = await pushStockAccounts(clean);
        return res.status(200).json({
          ok: true,
          adicionadas: added,
          estoque_atual: await stockCount(),
          contas_estoque: await getStockAccounts(),
        });
      }

      // 2. Remover uma conta específica do estoque
      if (action === "remove_stock") {
        const removed = await removeStockAccount(Number(index));
        return res.status(200).json({
          ok: removed,
          estoque_atual: await stockCount(),
          contas_estoque: await getStockAccounts(),
        });
      }

      // 3. Simular uma venda de teste (para testar som, painel e notificações)
      if (action === "test_sale") {
        const testSale = {
          id: `test-${Date.now()}`,
          order_nsu: `teste-${Date.now()}`,
          transaction_nsu: `tx-${Date.now()}`,
          email: "cliente.teste@gmail.com",
          produto: "muse-ia",
          produto_nome: "MUSE IA — acesso completo",
          valor: 79.99,
          conta_entregue: "usuario.demo@muse.ai (senha: Demo12345!)",
          data: new Date().toISOString(),
          status: "pago",
        };
        await recordSale(testSale);
        return res.status(200).json({ ok: true, mensagem: "Venda de teste gerada com sucesso!", sale: testSale });
      }

      // 4. Salvar configurações de notificação em variáveis de runtime
      if (action === "config") {
        if (callmebot_key) process.env.CALLMEBOT_API_KEY = callmebot_key;
        if (notify_phone) process.env.NOTIFY_PHONE = notify_phone;
        if (webhook_url) process.env.NOTIFICATION_WEBHOOK = webhook_url;
        return res.status(200).json({ ok: true, mensagem: "Configurações de notificação salvas!" });
      }

      return res.status(400).json({ error: "Ação não reconhecida." });
    }

    return res.status(405).json({ error: "Use GET ou POST." });
  } catch (e) {
    console.error("Erro no admin:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
