// POST /api/checkout { email, produto }
// Gera o link de pagamento na InfinitePay e devolve { checkout_url, order_nsu }.
const {
  PRODUCTS,
  INFINITEPAY_HANDLE,
  INFINITEPAY_API,
  PUBLIC_URL,
  isValidEmail,
  newOrderNsu,
} = require("../lib/products");
const { saveOrder } = require("../lib/store");

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

module.exports = async function handler(req, res) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  try {
    const { email, produto } = req.body || {};
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Informe um e-mail válido." });
    }
    const item = PRODUCTS[produto];
    if (!item) {
      return res.status(400).json({ error: "Produto inválido." });
    }
    if (!INFINITEPAY_HANDLE || !PUBLIC_URL) {
      return res
        .status(500)
        .json({ error: "Checkout ainda não configurado (INFINITEPAY_HANDLE / PUBLIC_URL)." });
    }

    const order_nsu = newOrderNsu(produto);

    // Salva o pedido antes de gerar o link (o webhook valida contra ele)
    await saveOrder(order_nsu, {
      email,
      produto,
      created_at: new Date().toISOString(),
      status: "aguardando",
    });

    const ipRes = await fetch(`${INFINITEPAY_API}/links`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle: INFINITEPAY_HANDLE,
        items: [{ quantity: 1, price: item.priceCents, description: item.title }],
        order_nsu,
        redirect_url: `${PUBLIC_URL}/api/entrega?pagamento=aprovado&produto=${produto}&order_nsu=${order_nsu}&email=${encodeURIComponent(email)}`,
        webhook_url: `${PUBLIC_URL}/api/webhook`,
        customer: { email },
        metadata: { produto, email, order_nsu },
      }),
    });

    if (!ipRes.ok) {
      const err = await ipRes.text();
      throw new Error(`InfinitePay falhou (${ipRes.status}): ${err}`);
    }
    const data = await ipRes.json();
    const checkout_url = data.link || data.url || data.payment_url || data.checkout_url;
    if (!checkout_url) {
      throw new Error("Resposta inesperada da InfinitePay.");
    }

    return res.status(200).json({ checkout_url, order_nsu });
  } catch (e) {
    console.error("Erro no checkout:", e.message);
    return res.status(500).json({ error: "Não foi possível iniciar o pagamento. Tente novamente." });
  }
};
