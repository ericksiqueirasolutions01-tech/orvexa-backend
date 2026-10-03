// Painel de controle de estoque e vendas — Protegido por ADMIN_TOKEN e credenciais
const { PRODUCTS, ADMIN_TOKEN, ADMIN_EMAIL, ADMIN_PASSWORD, isValidEmail } = require("../lib/products");
const {
  pushStockAccounts,
  stockCount,
  getAllStockCounts,
  getStockAccounts,
  removeStockAccount,
  getSalesHistory,
  clearSalesHistory,
  recordSale,
  getOrder,
  deliverOrder,
  getPendingOrders,
  markEmailSent,
} = require("../lib/store");
const {
  sendEmail,
  emailMuseIa,
  emailFlowAiPro,
  emailBuyerManualDelivery,
} = require("../lib/email");

function authorized(req) {
  const headers = req.headers || {};
  const authHeader = headers.authorization || "";
  const bearerToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : null;
  const query = req.query || {};
  const body = req.body || {};
  const token = query.token || body.token || bearerToken;
  if (Boolean(ADMIN_TOKEN) && token === ADMIN_TOKEN) {
    return true;
  }
  if (body.email && body.password) {
    return (
      String(body.email).trim().toLowerCase() === ADMIN_EMAIL.toLowerCase() &&
      String(body.password) === ADMIN_PASSWORD
    );
  }
  return false;
}

module.exports = async function handler(req, res) {
  // Tratar ação de login direto com email e senha
  if (req.method === "POST" && req.body && req.body.action === "login") {
    const { email, password } = req.body;
    const emailMatch = String(email || "").trim().toLowerCase() === ADMIN_EMAIL.toLowerCase();
    const passMatch = String(password || "") === ADMIN_PASSWORD;
    if (emailMatch && passMatch) {
      return res.status(200).json({
        ok: true,
        message: "Login realizado com sucesso!",
        token: ADMIN_TOKEN,
        user: {
          email: ADMIN_EMAIL,
          name: "Erick Siqueira",
          role: "Administrador Geral"
        }
      });
    }
    return res.status(401).json({ ok: false, error: "E-mail ou senha incorretos. Verifique suas credenciais." });
  }

  if (!authorized(req)) {
    return res.status(401).json({ ok: false, error: "Acesso não autorizado. Faça login com suas credenciais." });
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
      const pedidosPendentes = await getPendingOrders();
      const faturamentoTotal = vendas.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
      const estoqueTotal = Object.values(stocks).reduce((sum, c) => sum + (Number(c) || 0), 0);

      const vendasMuse = vendas.filter((v) => v.produto === "muse-ia");
      const vendasGemini = vendas.filter((v) => v.produto === "flow-ai-pro");
      const faturamentoMuse = vendasMuse.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
      const faturamentoGemini = vendasGemini.reduce((sum, v) => sum + (Number(v.valor) || 0), 0);
      const ticketMedio = vendas.length ? faturamentoTotal / vendas.length : 0;

      return res.status(200).json({
        ok: true,
        stocks,
        produtos: PRODUCTS,
        vendas,
        pedidos_pendentes: pedidosPendentes,
        resumo: {
          total_vendas: vendas.length,
          faturamento_total: faturamentoTotal,
          estoque_total: estoqueTotal,
          ticket_medio: ticketMedio,
          vendas_muse: vendasMuse.length,
          faturamento_muse: faturamentoMuse,
          vendas_gemini: vendasGemini.length,
          faturamento_gemini: faturamentoGemini,
        },
      });
    }

    // POST: Ações de cadastro, remoção, teste de venda e consulta
    if (req.method === "POST") {
      const body = req.body || {};
      const action = body.action || "add_stock";
      const produto = body.produto || "muse-ia";

      if (action === "check_auth") {
        return res.status(200).json({
          ok: true,
          user: {
            email: ADMIN_EMAIL,
            name: "Erick Siqueira",
            role: "Administrador Geral"
          }
        });
      }

      if (action === "deliver_order") {
        const orderNsu = body.order_nsu;
        if (!orderNsu) return res.status(400).json({ error: "order_nsu é obrigatório." });

        const order = await getOrder(orderNsu);
        if (!order) return res.status(404).json({ error: "Pedido não encontrado." });

        let prodKey = order.produto;
        if (!prodKey) {
          if (orderNsu.startsWith("muse-ia")) prodKey = "muse-ia";
          else if (orderNsu.startsWith("flow-ai-pro")) prodKey = "flow-ai-pro";
          else if (orderNsu.startsWith("lovable-pro")) prodKey = "lovable-pro";
          else if (orderNsu.startsWith("duolingo-super")) prodKey = "duolingo-super";
          else if (orderNsu.startsWith("capcut-pro")) prodKey = "capcut-pro";
          else if (orderNsu.startsWith("manus-mensal")) prodKey = "manus-mensal";
          else prodKey = "muse-ia";
        }

        const delivery = await deliverOrder({
          orderNsu,
          transactionNsu: order.transaction_nsu || `tx-admin-${Date.now()}`,
          produto: prodKey,
          email: order.email,
          phone: order.phone,
        });

        // Dispara e-mail de entrega para o cliente
        if (order.email && isValidEmail(order.email)) {
          const prodObj = PRODUCTS[prodKey] || { title: prodKey, short: prodKey };
          try {
            if (delivery.isManualDelivery) {
              await sendEmail(
                order.email,
                `⏳ ${prodObj.title} — entrega pelo nosso suporte`,
                emailBuyerManualDelivery({
                  produtoTitle: prodObj.title,
                  orderNsu,
                  email: order.email,
                  phone: order.phone,
                })
              );
              await markEmailSent(orderNsu);
            } else if (prodKey === "muse-ia" && delivery.deliveredItem.includes(";")) {
              const [l, s] = delivery.deliveredItem.split(";");
              await sendEmail(
                order.email,
                `🚀 Seu Acesso à ${prodObj.short} Foi Liberado!`,
                emailMuseIa({ login: l, senha: s, orderNsu, buyerEmail: order.email })
              );
              await markEmailSent(orderNsu);
            } else if (prodKey === "flow-ai-pro") {
              await sendEmail(
                order.email,
                `⭐ Seu Google AI Pro + Flow (18 Meses) Está Pronto!`,
                emailFlowAiPro({ link: delivery.deliveredItem, orderNsu })
              );
              await markEmailSent(orderNsu);
            }
          } catch (eEmail) {
            console.warn("Aviso envio e-mail manual admin:", eEmail.message);
          }
        }

        return res.status(200).json({
          ok: true,
          message: "Pedido entregue com sucesso!",
          deliveredItem: delivery.deliveredItem,
          delivery,
        });
      }

      if (!PRODUCTS[produto] && action !== "config" && action !== "test_sale" && action !== "clear_sales" && action !== "check_auth" && action !== "deliver_order") {
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

      if (action === "clear_sales") {
        await clearSalesHistory();
        return res.status(200).json({ ok: true, message: "Histórico de vendas zerado com sucesso!" });
      }

      return res.status(400).json({ error: `Ação desconhecida: ${action}` });
    }

    return res.status(405).json({ error: "Método não permitido. Use GET ou POST." });
  } catch (e) {
    console.error("Erro no api/admin:", e.message);
    return res.status(500).json({ error: e.message });
  }
};
