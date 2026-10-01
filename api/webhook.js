// POST /api/webhook — a InfinitePay chama aqui quando o pagamento é aprovado.
// Confere o pedido, retira a conta ou link do estoque respectivo e entrega por e-mail e painel.
const { PRODUCTS, isValidEmail } = require("../lib/products");
const {
  getOrder,
  deliverOrder,
  markEmailSent,
  stockCount,
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

    const order = await getOrder(order_nsu);
    let produtoKey = order && order.produto;
    if (!produtoKey) {
      if (order_nsu.startsWith("muse-ia")) produtoKey = "muse-ia";
      else if (order_nsu.startsWith("flow-ai-pro")) produtoKey = "flow-ai-pro";
      else if (order_nsu.startsWith("super-duolingo")) produtoKey = "super-duolingo";
      else produtoKey = "muse-ia";
    }

    const produto = PRODUCTS[produtoKey];
    if (!produto) {
      console.error(`Webhook: produto desconhecido (${produtoKey}).`);
      return res.status(200).end();
    }

    // Valida valor pago (se fornecido pela InfinitePay)
    const paidValue = Number(paid_amount || amount || 0);
    if (paidValue > 0 && paidValue < produto.priceCents) {
      console.error(
        `Webhook: valor divergente no pedido ${order_nsu} (paid=${paidValue}, esperado=${produto.priceCents}).`
      );
      return res.status(200).end();
    }

    const buyerEmail = (order && order.email) || (req.body.customer && req.body.customer.email) || (req.body.metadata && req.body.metadata.email) || "";
    const buyerPhone = (order && order.phone) || (req.body.customer && (req.body.customer.phone || req.body.customer.phone_number)) || (req.body.metadata && req.body.metadata.phone) || "";

    // Executa entrega atômica e idempotente (evita qualquer retirada duplicada do estoque)
    const delivery = await deliverOrder({
      orderNsu: order_nsu,
      transactionNsu: transaction_nsu,
      produto: produtoKey,
      email: buyerEmail,
      phone: buyerPhone,
    });

    const deliveredText = delivery.deliveredItem;
    const hasItem = deliveredText && !deliveredText.startsWith("⚠️");

    // Dispara envio de e-mail APENAS se ainda não tiver sido enviado
    if (hasItem && !delivery.emailSent && isValidEmail(buyerEmail)) {
      try {
        const shortOrder = order_nsu.length > 8 ? order_nsu.slice(-8).toUpperCase() : order_nsu;
        if (produtoKey === "muse-ia" && deliveredText.includes(";")) {
          const [l, s] = deliveredText.split(";");
          await sendEmail(
            buyerEmail,
            `🚀 Seu Acesso à ${produto.short} Foi Liberado! [Pedido #${shortOrder}]`,
            emailMuseIa({ login: l, senha: s, orderNsu: order_nsu })
          );
          await markEmailSent(order_nsu);
        } else if (produtoKey === "flow-ai-pro") {
          await sendEmail(
            buyerEmail,
            `⭐ Seu Google AI Pro + Flow (18 Meses) Está Pronto! [Pedido #${shortOrder}]`,
            emailFlowAiPro({ link: deliveredText, orderNsu: order_nsu })
          );
          await markEmailSent(order_nsu);
        } else if (produtoKey === "super-duolingo") {
          await sendEmail(
            buyerEmail,
            `🦉 Seu Super Duolingo (1 Ano) Está Liberado! [Pedido #${shortOrder}]`,
            emailSuperDuolingo({ link: deliveredText, orderNsu: order_nsu })
          );
          await markEmailSent(order_nsu);
        }
      } catch (errEmail) {
        console.warn("Aviso envio de e-mail (webhook):", errEmail.message);
      }
    }

    // Se estoque acabou e era uma entrega nova, avisa admin
    if (delivery.isStockEmpty && delivery.isNewDelivery) {
      await notifyAdmin(
        `⚠️ Estoque esgotado: ${produto.short}`,
        `<p>Pagamento aprovado para <b>${buyerEmail}</b> (${produto.title}, pedido ${order_nsu}), mas <b>não havia itens no estoque</b>.</p>`
      );
    }

    // Alerta de estoque baixo se houve retirada
    if (delivery.isNewDelivery && !delivery.isStockEmpty) {
      try {
        const remaining = await stockCount(produtoKey);
        if (remaining <= 2) {
          await notifyAdmin(
            `⚠️ Estoque baixo: ${produto.short} (${remaining} restantes)`,
            `<p>Restam apenas <b>${remaining}</b> itens de <b>${produto.title}</b> no estoque. Cadastre mais pelo painel admin.</p>`
          );
        }
      } catch (eCnt) {}
    }

    console.log(`✅ [WEBHOOK SUCESSO] ${produto.title} para ${buyerEmail} (pedido ${order_nsu})`);
    return res.status(200).end();
  } catch (e) {
    console.error("Erro no webhook:", e.message);
    return res.status(200).end();
  }
};
