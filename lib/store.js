// Persistência no Vercel KV com suporte a estoque independente por produto
const { kv } = require("@vercel/kv");

// Estoques em memória com contas e links iniciais prontos
const memoryStocks = {
  "muse-ia": [
    { login: "er31204@zavex.sbs", senha: "nB3AYX=JdQ@" }
  ],
  "flow-ai-pro": [
    { link: "https://one.google.com/promo/claim?token=FLOW-PRO-18M-EXEMPLO" }
  ],
  "super-duolingo": [
    { link: "https://www.duolingo.com/super/redeem?token=DUO-1Y-EXEMPLO" }
  ]
};

const memoryOrders = new Map();
const memoryDelivered = new Set();
const memorySales = [
  {
    id: "sale-demo-1",
    order_nsu: "muse-ia-demo-1",
    transaction_nsu: "tx-demo-8841",
    email: "cliente.exemplo@gmail.com",
    produto: "muse-ia",
    produto_nome: "MUSE IA — acesso completo",
    valor: 79.99,
    conta_entregue: "er31204@zavex.sbs (senha: nB3AYX=JdQ@)",
    data: new Date(Date.now() - 3600000).toISOString(),
    status: "pago"
  }
];

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// 1. Pedidos
async function saveOrder(orderNsu, data) {
  memoryOrders.set(orderNsu, data);
  if (hasKv()) {
    try {
      await kv.hset(`order:${orderNsu}`, data);
      await kv.expire(`order:${orderNsu}`, 7200);
    } catch (e) {
      console.warn("Aviso KV saveOrder:", e.message);
    }
  }
}

async function getOrder(orderNsu) {
  if (hasKv()) {
    try {
      const data = await kv.hgetall(`order:${orderNsu}`);
      if (data && Object.keys(data).length) return data;
    } catch (e) {
      console.warn("Aviso KV getOrder:", e.message);
    }
  }
  return memoryOrders.get(orderNsu) || null;
}

async function setOrderStatus(orderNsu, patch) {
  const current = memoryOrders.get(orderNsu) || {};
  memoryOrders.set(orderNsu, { ...current, ...patch });
  if (hasKv()) {
    try {
      await kv.hset(`order:${orderNsu}`, patch);
    } catch (e) {
      console.warn("Aviso KV setOrderStatus:", e.message);
    }
  }
}

// 2. Idempotência
async function alreadyDelivered(transactionNsu) {
  if (hasKv()) {
    try {
      return (await kv.sismember("delivered", String(transactionNsu))) === 1;
    } catch (e) {
      console.warn("Aviso KV alreadyDelivered:", e.message);
    }
  }
  return memoryDelivered.has(String(transactionNsu));
}

async function markDelivered(transactionNsu) {
  memoryDelivered.add(String(transactionNsu));
  if (hasKv()) {
    try {
      await kv.sadd("delivered", String(transactionNsu));
    } catch (e) {
      console.warn("Aviso KV markDelivered:", e.message);
    }
  }
}

// 3. Gestão de Estoques Multi-Produto (MUSE IA, Gemini Pro 18m, Super Duolingo)
function getStockKey(produto) {
  return `stock:${produto || "muse-ia"}`;
}

async function popStockAccount(produto = "muse-ia") {
  const key = getStockKey(produto);
  if (hasKv()) {
    try {
      const raw = await kv.lpop(key);
      if (raw) return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.warn("Aviso KV popStockAccount:", e.message);
    }
  }
  const list = memoryStocks[produto] || [];
  return list.shift() || null;
}

async function pushStockAccounts(accounts, produto = "muse-ia") {
  if (!accounts || !accounts.length) return 0;
  const key = getStockKey(produto);
  if (hasKv()) {
    try {
      await kv.rpush(key, ...accounts.map((a) => JSON.stringify(a)));
      return accounts.length;
    } catch (e) {
      console.warn("Aviso KV pushStockAccounts:", e.message);
    }
  }
  if (!memoryStocks[produto]) memoryStocks[produto] = [];
  memoryStocks[produto].push(...accounts);
  return accounts.length;
}

async function stockCount(produto = "muse-ia") {
  const key = getStockKey(produto);
  if (hasKv()) {
    try {
      return await kv.llen(key);
    } catch (e) {
      console.warn("Aviso KV stockCount:", e.message);
    }
  }
  return (memoryStocks[produto] || []).length;
}

async function getAllStockCounts() {
  const produtos = ["muse-ia", "flow-ai-pro", "super-duolingo"];
  const counts = {};
  for (const p of produtos) {
    counts[p] = await stockCount(p);
  }
  return counts;
}

async function getStockAccounts(produto = "muse-ia") {
  const key = getStockKey(produto);
  if (hasKv()) {
    try {
      const list = await kv.lrange(key, 0, -1);
      if (list && list.length) {
        return list.map((item) => (typeof item === "string" ? JSON.parse(item) : item));
      }
    } catch (e) {
      console.warn("Aviso KV getStockAccounts:", e.message);
    }
  }
  return [...(memoryStocks[produto] || [])];
}

async function removeStockAccount(index, produto = "muse-ia") {
  const accounts = await getStockAccounts(produto);
  if (index >= 0 && index < accounts.length) {
    accounts.splice(index, 1);
    const key = getStockKey(produto);
    if (hasKv()) {
      try {
        await kv.del(key);
        if (accounts.length) {
          await kv.rpush(key, ...accounts.map((a) => JSON.stringify(a)));
        }
      } catch (e) {
        console.warn("Aviso KV removeStockAccount:", e.message);
      }
    }
    memoryStocks[produto] = [...accounts];
    return true;
  }
  return false;
}

// 4. Histórico de Vendas
async function recordSale(saleData) {
  memorySales.unshift(saleData);
  if (hasKv()) {
    try {
      await kv.lpush("sales:history", JSON.stringify(saleData));
    } catch (e) {
      console.warn("Aviso KV recordSale:", e.message);
    }
  }
  await notifySaleExternal(saleData);
}

async function getSalesHistory() {
  if (hasKv()) {
    try {
      const list = await kv.lrange("sales:history", 0, 200);
      if (list && list.length) {
        return list.map((item) => (typeof item === "string" ? JSON.parse(item) : item));
      }
    } catch (e) {
      console.warn("Aviso KV getSalesHistory:", e.message);
    }
  }
  return [...memorySales];
}

// 5. Notificação Externa (WhatsApp CallMeBot / Webhook)
async function notifySaleExternal(sale) {
  const callmebotKey = process.env.CALLMEBOT_API_KEY;
  const notifyPhone = process.env.NOTIFY_PHONE || "5521992936790";
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK;

  const msg = `🎉 *NOVA VENDA CONFIRMADA!*\n\n📦 *Produto:* ${sale.produto_nome || sale.produto}\n💰 *Valor:* R$ ${Number(sale.valor).toFixed(2)}\n👤 *Cliente:* ${sale.email}\n🔑 *Entregue:* ${sale.conta_entregue}\n🆔 *Pedido:* ${sale.order_nsu}`;

  if (callmebotKey && notifyPhone) {
    try {
      const url = `https://api.callmebot.com/whatsapp.php?phone=${notifyPhone}&text=${encodeURIComponent(msg)}&apikey=${callmebotKey}`;
      await fetch(url);
    } catch (e) {
      console.error("Falha ao enviar WhatsApp CallMeBot:", e.message);
    }
  }

  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: msg, sale }),
      });
    } catch (e) {
      console.error("Falha ao enviar Webhook:", e.message);
    }
  }
}

module.exports = {
  saveOrder,
  getOrder,
  setOrderStatus,
  alreadyDelivered,
  markDelivered,
  popStockAccount,
  pushStockAccounts,
  stockCount,
  getAllStockCounts,
  getStockAccounts,
  removeStockAccount,
  recordSale,
  getSalesHistory,
  hasKv,
};
