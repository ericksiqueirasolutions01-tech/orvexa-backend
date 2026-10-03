// POST /api/webhook — a InfinitePay chama aqui quando o pagamento é aprovado.
// Confere o pedido, retira a conta ou link do estoque respectivo e entrega por e-mail e painel.
const { PRODUCTS, isValidEmail } = require("../lib/products");
const {
  getOrder,
  deliverOrder,
  markEmailSent,
  stockCount,
} = require("../lib/store");
const {
  sendEmail,
  emailMuseIa,
  emailFlowAiPro,
  emailSuperDuolingo,
  emailSupportDelivery,
  emailBuyerManualDelivery,
  emailAdminManualDelivery,
} = require("../lib/email");

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
    const body = req.body || {};
    const data = body.data || body.transaction || body.payment || {};
    const metadata = body.metadata || data.metadata || {};

    const order_nsu = body.order_nsu || data.order_nsu || metadata.order_nsu || body.orderId || data.orderId || "";
    const transaction_nsu = body.transaction_nsu || data.transaction_nsu || body.transaction_id || data.transaction_id || body.id || data.id || body.nsu || data.nsu || `tx-${Date.now()}`;

    if (!order_nsu) {
      console.warn("Webhook recebido sem order_nsu:", JSON.stringify(body).slice(0, 200));
      return res.status(200).end();
    }

    const order = await getOrder(order_nsu);
    let produtoKey = (order && order.produto) || metadata.produto || "";
    if (!produtoKey) {
      if (order_nsu.startsWith("muse-ia")) produtoKey = "muse-ia";
      else if (order_nsu.startsWith("flow-ai-pro")) produtoKey = "flow-ai-pro";
      else if (order_nsu.startsWith("lovable-pro")) produtoKey = "lovable-pro";
      else if (order_nsu.startsWith("duolingo-super")) produtoKey = "duolingo-super";
      else if (order_nsu.startsWith("capcut-pro")) produtoKey = "capcut-pro";
      else if (order_nsu.startsWith("manus-mensal")) produtoKey = "manus-mensal";
      else if (order_nsu.startsWith("super-duolingo")) produtoKey = "duolingo-super";
      else produtoKey = "muse-ia";
    }

    const produto = PRODUCTS[produtoKey];
    if (!produto) {
      console.error(`Webhook: produto desconhecido (${produtoKey}) para pedido ${order_nsu}.`);
      return res.status(200).end();
    }

    // Valida valor pago (normaliza para centavos se enviado em Reais decimais)
    const rawPaid = Number(body.paid_amount || body.amount || data.paid_amount || data.amount || 0);
    const paidCents = rawPaid > 0 && rawPaid < 1000 ? Math.round(rawPaid * 100) : rawPaid;
    if (paidCents > 0 && paidCents < (produto.priceCents * 0.9)) {
      console.error(
        `Webhook: valor divergente no pedido ${order_nsu} (paid=${paidCents}, esperado=${produto.priceCents}).`
      );
      return res.status(200).end();
    }

    const buyerEmail = (order && order.email) || body.email || data.email || metadata.email || (body.customer && body.customer.email) || (data.customer && data.customer.email) || "";
    const buyerPhone = (order && order.phone) || body.phone || data.phone || metadata.phone || (body.customer && (body.customer.phone || body.customer.phone_number)) || (data.customer && (data.customer.phone || data.customer.phone_number)) || "";

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
    if (!delivery.emailSent) {
      const shortOrder = order_nsu.length > 8 ? order_nsu.slice(-8).toUpperCase() : order_nsu;

      if (delivery.isManualDelivery) {
        // 1. Envio de e-mail ao COMPRADOR
        if (isValidEmail(buyerEmail)) {
          try {
            await sendEmail(
              buyerEmail,
              `⏳ ${produto.title} — entrega pelo nosso suporte`,
              emailBuyerManualDelivery({
                produtoTitle: produto.title,
                orderNsu: order_nsu,
                email: buyerEmail,
                phone: buyerPhone,
              })
            );
          } catch (errBuyer) {
            console.warn("Aviso envio e-mail comprador (manual):", errBuyer.message);
          }
        }

        // 2. Envio de e-mail ao ADMIN com assunto estrito exigido pela automação externa:
        // 🛠️ ENTREGA MANUAL — {nome do produto} — pedido {order_nsu}
        const adminRecipient = process.env.ADMIN_EMAIL || "erick.siqueira.solutions01@gmail.com";
        try {
          await sendEmail(
            adminRecipient,
            `🛠️ ENTREGA MANUAL — ${produto.title} — pedido ${order_nsu}`,
            emailAdminManualDelivery({
              produtoTitle: produto.title,
              orderNsu: order_nsu,
              buyerEmail,
              buyerPhone,
              transactionNsu: transaction_nsu,
            })
          );
        } catch (errAdmin) {
          console.warn("Aviso envio e-mail admin (manual):", errAdmin.message);
        }

        await markEmailSent(order_nsu);
      } else {
        // 3. Produtos de estoque automático (quando estoque disponível)
        if (isValidEmail(buyerEmail)) {
          try {
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
            }
          } catch (errAuto) {
            console.warn("Aviso envio e-mail estoque auto:", errAuto.message);
          }
        }

        // Alerta de estoque baixo se houve retirada do estoque automático
        if (delivery.isNewDelivery) {
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
      }
    }

    console.log(`✅ [WEBHOOK SUCESSO] ${produto.title} para ${buyerEmail} (pedido ${order_nsu})`);
    return res.status(200).end();
  } catch (e) {
    console.error("Erro no webhook:", e.message);
    return res.status(200).end();
  }
};
