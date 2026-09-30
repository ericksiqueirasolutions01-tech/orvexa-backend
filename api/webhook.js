// POST /api/webhook — a InfinitePay chama aqui quando o pagamento é aprovado.
// Confere o pedido, retira a conta ou link do estoque respectivo e entrega por e-mail e painel.
const { PRODUCTS, isValidEmail } = require("../lib/products");
const {
  getOrder,
  setOrderStatus,
  alreadyDelivered,
  markDelivered,
  popStockAccount,
  stockCount,
  recordSale,
} = require("../lib/store");
const { sendEmail, emailMuseIa, emailFlowAiPro, emailSuperDuolingo } = require("../lib/email");

async function notifyAdmin(subject, html) {
  const admin = process.env.ADMIN_EMAIL;
  if (admin) {
    try {
      await sendEmail(admin, subject, html);
    } catch (e) {
      console.error("Falha ao avisar admin:", e.message);
    }
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { order_nsu, transaction_nsu, paid_amount, amount } = req.body || {};
    if (!order_nsu || !transaction_nsu) return res.status(200).end();

    // Idempotência: ignora avisos repetidos da mesma transação
    if (await alreadyDelivered(transaction_nsu)) return res.status(200).end();

    const order = await getOrder(order_nsu);
    if (!order) {
      console.error(`Webhook: order_nsu desconhecido (${order_nsu}).`);
      return res.status(200).end();
    }

    const produtoKey = order.produto;
    const produto = PRODUCTS[produtoKey];
    if (!produto) {
      console.error(`Webhook: produto desconhecido (${produtoKey}).`);
      return res.status(200).end();
    }

    // Valida valor pago (paid_amount ou amount >= preço em centavos)
    if (Number(paid_amount) < produto.priceCents || Number(amount) < produto.priceCents) {
      console.error(
        `Webhook: valor divergente no pedido ${order_nsu} (paid=${paid_amount || amount}, esperado=${produto.priceCents}).`
      );
      return res.status(200).end();
    }

    const buyerEmail = order.email;
    if (!isValidEmail(buyerEmail)) {
      console.error(`Webhook: e-mail inválido no pedido ${order_nsu}.`);
      return res.status(200).end();
    }

    let deliveredItem = null;
    let deliveredText = "";

    // ---- 1. MUSE IA: Estoque de login e senha + procedimento ----
    if (produtoKey === "muse-ia") {
      const account = await popStockAccount("muse-ia");
      if (!account) {
        console.error("⚠️ ESTOQUE ESGOTADO DE MUSE IA! Pagamento aprovado sem conta para entregar.");
        deliveredText = "⚠️ Estoque esgotado — reposição manual necessária";
        await notifyAdmin(
          "⚠️ Estoque de MUSE IA esgotado",
          `<p>Pagamento aprovado para <b>${buyerEmail}</b> (pedido ${order_nsu}), mas <b>não havia contas de MUSE IA no estoque</b>. Cadastre novas contas no painel admin para envio ao cliente.</p>`
        );
      } else {
        deliveredItem = account;
        deliveredText = `${account.login};${account.senha}`;
        try {
          await sendEmail(
            buyerEmail,
            `🚀 Seu acesso à ${produto.short} foi liberado!`,
            emailMuseIa({ login: account.login, senha: account.senha })
          );
        } catch (errEmail) {
          console.warn("Aviso envio de e-mail (MUSE IA):", errEmail.message);
        }
      }
    }

    // ---- 2. Gemini Pro (Google Flow + AI Pro 18 meses): Link de ativação ----
    else if (produtoKey === "flow-ai-pro") {
      const linkObj = await popStockAccount("flow-ai-pro");
      const linkUrl = linkObj ? (linkObj.link || linkObj.activation_link || linkObj.url || linkObj) : null;

      if (!linkUrl) {
        console.error("⚠️ ESTOQUE ESGOTADO DE GEMINI PRO 18M! Sem link de ativação.");
        deliveredText = "⚠️ Estoque de links esgotado — reposição necessária";
        await notifyAdmin(
          "⚠️ Estoque de links Gemini Pro esgotado",
          `<p>Pagamento aprovado para <b>${buyerEmail}</b> (${produto.title}, pedido ${order_nsu}), mas <b>não havia links de ativação no estoque</b>. Cadastre novos links no painel admin.</p>`
        );
      } else {
        deliveredItem = linkObj;
        deliveredText = String(linkUrl);
        try {
          await sendEmail(
            buyerEmail,
            `⭐ Seu Google AI Pro + Flow (18 Meses) Está Pronto!`,
            emailFlowAiPro({ link: linkUrl })
          );
        } catch (errEmail) {
          console.warn("Aviso envio de e-mail (Flow AI Pro):", errEmail.message);
        }
      }
    }

    // ---- 3. Super Duolingo: Link de convite ----
    else if (produtoKey === "super-duolingo") {
      const duoObj = await popStockAccount("super-duolingo");
      const duoLink = duoObj ? (duoObj.link || duoObj.invite_link || duoObj.url || duoObj) : null;

      if (!duoLink) {
        console.error("⚠️ ESTOQUE ESGOTADO DE DUOLINGO! Sem link de convite.");
        deliveredText = "⚠️ Estoque de convites esgotado — reposição necessária";
        await notifyAdmin(
          "⚠️ Estoque de convites Duolingo esgotado",
          `<p>Pagamento aprovado para <b>${buyerEmail}</b> (${produto.title}, pedido ${order_nsu}), mas <b>não havia convites no estoque</b>.</p>`
        );
      } else {
        deliveredItem = duoObj;
        deliveredText = String(duoLink);
        try {
          await sendEmail(
            buyerEmail,
            `🦉 Seu Super Duolingo (1 Ano) Está Liberado!`,
            emailSuperDuolingo({ link: duoLink })
          );
        } catch (errEmail) {
          console.warn("Aviso envio de e-mail (Duolingo):", errEmail.message);
        }
      }
    }

    // Registra a venda no histórico do painel e envia notificações (WhatsApp/Webhook)
    const saleRecord = {
      id: `sale-${Date.now()}`,
      order_nsu,
      transaction_nsu: String(transaction_nsu),
      email: buyerEmail,
      produto: produtoKey,
      produto_nome: produto.title,
      valor: produto.priceBRL,
      conta_entregue: deliveredText,
      data: new Date().toISOString(),
      status: "pago",
    };
    await recordSale(saleRecord);

    // Atualiza status do pedido com o item entregue para exibir em /api/entrega
    await setOrderStatus(order_nsu, {
      status: "pago",
      transaction_nsu: String(transaction_nsu),
      delivered_item: deliveredText,
      paid_at: new Date().toISOString(),
    });

    await markDelivered(transaction_nsu);

    // Alerta de estoque baixo
    const remaining = await stockCount(produtoKey);
    if (remaining <= 2) {
      await notifyAdmin(
        `⚠️ Estoque baixo: ${produto.short} (${remaining} restantes)`,
        `<p>Restam apenas <b>${remaining}</b> itens de <b>${produto.title}</b> no estoque. Cadastre mais pelo painel admin.</p>`
      );
    }

    console.log(`✅ [VENDA CONFIRMADA] ${produto.title} entregue para ${buyerEmail} (pedido ${order_nsu})`);
    return res.status(200).end();
  } catch (e) {
    console.error("Erro no webhook:", e.message);
    return res.status(200).end();
  }
};
