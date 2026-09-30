// POST /api/webhook — a InfinitePay chama aqui quando o pagamento é aprovado.
// Confere o pedido, entrega o produto e envia o e-mail automaticamente.
const { PRODUCTS, isValidEmail } = require("../lib/products");
const {
  getOrder,
  setOrderStatus,
  alreadyDelivered,
  markDelivered,
  popStockAccount,
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

    // Idempotência: ignora avisos repetidos
    if (await alreadyDelivered(transaction_nsu)) return res.status(200).end();

    const order = await getOrder(order_nsu);
    if (!order) {
      console.error(`Webhook: order_nsu desconhecido (${order_nsu}).`);
      return res.status(200).end();
    }

    const produto = PRODUCTS[order.produto];
    if (!produto) {
      console.error(`Webhook: produto desconhecido (${order.produto}).`);
      return res.status(200).end();
    }

    // Valida o valor pago (paid_amount pode incluir taxas; aceita >= esperado)
    if (Number(paid_amount) < produto.priceCents || Number(amount) < produto.priceCents) {
      console.error(
        `Webhook: valor divergente no pedido ${order_nsu} (paid=${paid_amount}, esperado=${produto.priceCents}).`
      );
      return res.status(200).end();
    }

    const buyerEmail = order.email;
    if (!isValidEmail(buyerEmail)) {
      console.error(`Webhook: e-mail inválido no pedido ${order_nsu}.`);
      return res.status(200).end();
    }

    // ---- Entrega conforme o tipo do produto ----
    if (produto.delivery === "stock") {
      const account = await popStockAccount(); // atômico: nunca entrega a mesma conta 2x
      if (!account) {
        console.error("⚠️ ESTOQUE ESGOTADO! Pagamento aprovado sem conta para entregar.");
        await notifyAdmin(
          "⚠️ Estoque de contas esgotado",
          `<p>Pagamento aprovado (<b>${buyerEmail}</b>, ${produto.title}, pedido ${order_nsu}) mas <b>sem contas no estoque</b>. Cadastre mais pelo painel admin e envie o acesso manualmente.</p>`
        );
        return res.status(200).end();
      }

      await sendEmail(
        buyerEmail,
        `🚀 Seu acesso à ${produto.short} foi liberado!`,
        emailMuseIa({ login: account.login, senha: account.senha })
      );

      const remaining = await stockCount();
      if (remaining <= 3) {
        await notifyAdmin(
          `⚠️ Estoque baixo: ${remaining} conta(s) restantes`,
          `<p>Restam apenas <b>${remaining}</b> contas de MUSE IA no estoque. Cadastre mais em breve.</p>`
        );
      }
    } else {
      const emailHtml = order.produto === "flow-ai-pro" ? emailFlowAiPro() : emailSuperDuolingo();
      await sendEmail(buyerEmail, `🎉 Pagamento confirmado — ative ${produto.short}!`, emailHtml);
    }

    await setOrderStatus(order_nsu, { status: "pago", transaction_nsu: String(transaction_nsu) });
    await markDelivered(transaction_nsu);
    console.log(`✅ ${produto.title} entregue para ${buyerEmail} (pedido ${order_nsu})`);
    return res.status(200).end();
  } catch (e) {
    // Responde 200 mesmo com erro interno para a InfinitePay não reenviar em loop;
    // o erro fica no log da Vercel para investigação.
    console.error("Erro no webhook:", e.message);
    return res.status(200).end();
  }
};
