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
