// Persistência no Vercel KV (Redis) com fallback em memória seguro e histórico de vendas.
const { kv } = require("@vercel/kv");

// Fallback de memória
const memoryStock = [
  { login: "er31204@zavex.sbs", senha: "nB3AYX=JdQ@" }
];
const memoryOrders = new Map();
const memoryDelivered = new Set();
const memorySales = [
  {
    id: "sale-demo-1",
    order_nsu: "flow-ai-pro-exemplo",
    transaction_nsu: "tx-demo-123",
    email: "cliente.exemplo@gmail.com",
    produto: "flow-ai-pro",
    produto_nome: "Google Flow + Google AI Pro",
    valor: 49.99,
    conta_entregue: "Link de ativação Google + WhatsApp",
    data: new Date(Date.now() - 3600000).toISOString(),
    status: "pago"
  }
];

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// Pedido pendente (usado pelo webhook para validar a entrega).
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

// Idempotência: marca transaction_nsu como já entregue.
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

// Estoque de contas (MUSE IA). popStock é atômico.
async function popStockAccount() {
  if (hasKv()) {
    try {
      const raw = await kv.lpop("stock:muse-ia");
      if (raw) return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.warn("Aviso KV popStockAccount:", e.message);
    }
  }
  return memoryStock.shift() || null;
}

async function pushStockAccounts(accounts) {
  if (!accounts.length) return 0;
  if (hasKv()) {
    try {
      await kv.rpush("stock:muse-ia", ...accounts.map((a) => JSON.stringify(a)));
      return accounts.length;
    } catch (e) {
      console.warn("Aviso KV pushStockAccounts:", e.message);
    }
  }
  memoryStock.push(...accounts);
  return accounts.length;
}

async function stockCount() {
  if (hasKv()) {
    try {
      return await kv.llen("stock:muse-ia");
    } catch (e) {
      console.warn("Aviso KV stockCount:", e.message);
    }
  }
  return memoryStock.length;
}

async function getStockAccounts() {
  if (hasKv()) {
    try {
      const list = await kv.lrange("stock:muse-ia", 0, -1);
      if (list && list.length) {
        return list.map((item) => (typeof item === "string" ? JSON.parse(item) : item));
      }
    } catch (e) {
      console.warn("Aviso KV getStockAccounts:", e.message);
    }
  }
  return [...memoryStock];
}

async function removeStockAccount(index) {
  const accounts = await getStockAccounts();
  if (index >= 0 && index < accounts.length) {
    accounts.splice(index, 1);
    if (hasKv()) {
      try {
        await kv.del("stock:muse-ia");
        if (accounts.length) {
          await kv.rpush("stock:muse-ia", ...accounts.map((a) => JSON.stringify(a)));
        }
      } catch (e) {
        console.warn("Aviso KV removeStockAccount:", e.message);
      }
    }
    memoryStock.length = 0;
    memoryStock.push(...accounts);
    return true;
  }
  return false;
}

// Histórico de vendas realizadas
async function recordSale(saleData) {
  memorySales.unshift(saleData);
  if (hasKv()) {
    try {
      await kv.lpush("sales:history", JSON.stringify(saleData));
    } catch (e) {
      console.warn("Aviso KV recordSale:", e.message);
    }
  }

  // Notificação via webhook ou CallMeBot WhatsApp se configurado
  await notifySaleExternal(saleData);
}

async function getSalesHistory() {
  if (hasKv()) {
    try {
      const list = await kv.lrange("sales:history", 0, 100);
      if (list && list.length) {
        return list.map((item) => (typeof item === "string" ? JSON.parse(item) : item));
      }
    } catch (e) {
      console.warn("Aviso KV getSalesHistory:", e.message);
    }
  }
  return [...memorySales];
}

// Notificador externo de vendas (WhatsApp via CallMeBot / Webhook)
async function notifySaleExternal(sale) {
  const callmebotKey = process.env.CALLMEBOT_API_KEY;
  const notifyPhone = process.env.NOTIFY_PHONE || "5521992936790";
  const webhookUrl = process.env.NOTIFICATION_WEBHOOK;

  const msg = `🎉 *NOVA VENDA ORVEXA!*\n\n📦 *Produto:* ${sale.produto_nome}\n💰 *Valor:* R$ ${Number(sale.valor).toFixed(2)}\n👤 *Cliente:* ${sale.email}\n🔑 *Entregue:* ${sale.conta_entregue}\n🆔 *Pedido:* ${sale.order_nsu}`;

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
        body: JSON.stringify({
          content: msg,
          sale,
        }),
      });
    } catch (e) {
      console.error("Falha ao enviar Webhook de notificação:", e.message);
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
  getStockAccounts,
  removeStockAccount,
  recordSale,
  getSalesHistory,
  hasKv,
};
