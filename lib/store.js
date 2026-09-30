// Persistência no Vercel KV (Redis). Na Vercel o disco das functions é
// temporário, então estoque, pedidos e entregas vivem aqui.
const { kv } = require("@vercel/kv");

function ensureKv() {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    throw new Error(
      "Vercel KV não configurado. No painel da Vercel: Storage → Create Database → KV e conecte ao projeto."
    );
  }
}

// Pedido pendente (usado pelo webhook para validar a entrega). Expira em 2h.
async function saveOrder(orderNsu, data) {
  try {
    ensureKv();
    await kv.hset(`order:${orderNsu}`, data);
    await kv.expire(`order:${orderNsu}`, 7200);
  } catch (err) {
    console.warn("Vercel KV ainda não configurado (pedido não persistido em cache temporário):", err.message);
  }
}

async function getOrder(orderNsu) {
  ensureKv();
  const data = await kv.hgetall(`order:${orderNsu}`);
  return data && Object.keys(data).length ? data : null;
}

async function setOrderStatus(orderNsu, patch) {
  ensureKv();
  await kv.hset(`order:${orderNsu}`, patch);
}

// Idempotência: marca transaction_nsu como já entregue.
async function alreadyDelivered(transactionNsu) {
  ensureKv();
  return (await kv.sismember("delivered", String(transactionNsu))) === 1;
}

async function markDelivered(transactionNsu) {
  ensureKv();
  await kv.sadd("delivered", String(transactionNsu));
}

// Estoque de contas (MUSE IA). popStock é atômico: nunca entrega a mesma
// conta duas vezes, mesmo com dois webhooks simultâneos.
async function popStockAccount() {
  ensureKv();
  const raw = await kv.lpop("stock:muse-ia");
  return raw ? JSON.parse(raw) : null;
}

async function pushStockAccounts(accounts) {
  ensureKv();
  if (!accounts.length) return 0;
  await kv.rpush("stock:muse-ia", ...accounts.map((a) => JSON.stringify(a)));
  return accounts.length;
}

async function stockCount() {
  ensureKv();
  return kv.llen("stock:muse-ia");
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
};
