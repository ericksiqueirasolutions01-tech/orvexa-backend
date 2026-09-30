// Persistência no Vercel KV (Redis) com fallback em memória seguro.
const { kv } = require("@vercel/kv");

// Fallback de memória para quando o Vercel KV ainda não tiver sido conectado pelo usuário
const memoryStock = [
  { login: "er31204@zavex.sbs", senha: "nB3AYX=JdQ@" }
];
const memoryOrders = new Map();
const memoryDelivered = new Set();

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
      console.warn("Aviso KV:", e.message);
    }
  }
}

async function getOrder(orderNsu) {
  if (hasKv()) {
    try {
      const data = await kv.hgetall(`order:${orderNsu}`);
      if (data && Object.keys(data).length) return data;
    } catch (e) {
      console.warn("Aviso KV:", e.message);
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
      console.warn("Aviso KV:", e.message);
    }
  }
}

// Idempotência: marca transaction_nsu como já entregue.
async function alreadyDelivered(transactionNsu) {
  if (hasKv()) {
    try {
      return (await kv.sismember("delivered", String(transactionNsu))) === 1;
    } catch (e) {
      console.warn("Aviso KV:", e.message);
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
      console.warn("Aviso KV:", e.message);
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
      console.warn("Aviso KV:", e.message);
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
      console.warn("Aviso KV:", e.message);
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
      console.warn("Aviso KV:", e.message);
    }
  }
  return memoryStock.length;
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
  hasKv,
};
