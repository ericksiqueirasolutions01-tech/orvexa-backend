// Persistência em Nuvem (GitHub Gist Cloud DB + Vercel KV) com suporte multi-produto
const { kv } = require("@vercel/kv");
const { GITHUB_GIST_ID, GITHUB_TOKEN } = require("./products");

// Memória local para cache rápido durante a execução da lambda
const memoryStocks = {
  "muse-ia": [],
  "flow-ai-pro": [],
  "super-duolingo": [],
};

const memoryOrders = new Map();
const memoryDelivered = new Set();
let memorySales = [];

function hasKv() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function hasCloudDb() {
  return Boolean(GITHUB_GIST_ID && GITHUB_TOKEN);
}

// 0. Sincronização com Cloud DB (GitHub Gist)
async function loadCloudDb() {
  if (!hasCloudDb()) return null;
  try {
    const res = await fetch(`https://api.github.com/gists/${GITHUB_GIST_ID}`, {
      headers: {
        "User-Agent": "Orvexa-Store",
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
      },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const raw = data.files && data.files["db.json"] && data.files["db.json"].content;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (!parsed.stocks) parsed.stocks = { "muse-ia": [], "flow-ai-pro": [] };
      if (!parsed.sales) parsed.sales = [];
      if (!parsed.orders) parsed.orders = {};
      if (!parsed.delivered) parsed.delivered = [];
      return parsed;
    }
  } catch (e) {
    console.warn("Aviso Cloud DB loadCloudDb:", e.message);
  }
  return null;
}

async function saveCloudDb(db) {
  if (!hasCloudDb()) return false;
  try {
    const res = await fetch(`https://api.github.com/gists/${GITHUB_GIST_ID}`, {
      method: "PATCH",
      headers: {
        "User-Agent": "Orvexa-Store",
        "Authorization": `Bearer ${GITHUB_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        files: {
          "db.json": { content: JSON.stringify(db, null, 2) },
        },
      }),
    });
    return res.ok;
  } catch (e) {
    console.warn("Aviso Cloud DB saveCloudDb:", e.message);
    return false;
  }
}

// 1. Pedidos
async function saveOrder(orderNsu, data) {
  memoryOrders.set(orderNsu, data);

  // Cloud DB
  const db = (await loadCloudDb()) || { stocks: { "muse-ia": [], "flow-ai-pro": [] }, sales: [], orders: {}, delivered: [] };
  if (!db.orders) db.orders = {};
  db.orders[orderNsu] = data;
  await saveCloudDb(db);

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
  if (memoryOrders.has(orderNsu)) {
    return memoryOrders.get(orderNsu);
  }

  // Cloud DB
  const db = await loadCloudDb();
  if (db && db.orders && db.orders[orderNsu]) {
    memoryOrders.set(orderNsu, db.orders[orderNsu]);
    return db.orders[orderNsu];
  }

  if (hasKv()) {
    try {
      const data = await kv.hgetall(`order:${orderNsu}`);
      if (data && Object.keys(data).length) return data;
    } catch (e) {
      console.warn("Aviso KV getOrder:", e.message);
    }
  }

  return null;
}

async function setOrderStatus(orderNsu, patch) {
  const current = (await getOrder(orderNsu)) || {};
  const updated = { ...current, ...patch };
  memoryOrders.set(orderNsu, updated);

  // Cloud DB
  const db = (await loadCloudDb()) || { stocks: { "muse-ia": [], "flow-ai-pro": [] }, sales: [], orders: {}, delivered: [] };
  if (!db.orders) db.orders = {};
  db.orders[orderNsu] = updated;
  await saveCloudDb(db);

  if (hasKv()) {
    try {
      await kv.hset(`order:${orderNsu}`, patch);
    } catch (e) {
      console.warn("Aviso KV setOrderStatus:", e.message);
    }
  }
}

// 2. Idempotência de Transação
async function alreadyDelivered(transactionNsu) {
  if (memoryDelivered.has(String(transactionNsu))) return true;

  const db = await loadCloudDb();
  if (db && db.delivered && db.delivered.includes(String(transactionNsu))) {
    memoryDelivered.add(String(transactionNsu));
    return true;
  }

  if (hasKv()) {
    try {
      return (await kv.sismember("delivered", String(transactionNsu))) === 1;
    } catch (e) {
      console.warn("Aviso KV alreadyDelivered:", e.message);
    }
  }

  return false;
}

async function markDelivered(transactionNsu) {
  memoryDelivered.add(String(transactionNsu));

  const db = (await loadCloudDb()) || { stocks: { "muse-ia": [], "flow-ai-pro": [] }, sales: [], orders: {}, delivered: [] };
  if (!db.delivered) db.delivered = [];
  if (!db.delivered.includes(String(transactionNsu))) {
    db.delivered.push(String(transactionNsu));
    await saveCloudDb(db);
  }

  if (hasKv()) {
    try {
      await kv.sadd("delivered", String(transactionNsu));
    } catch (e) {
      console.warn("Aviso KV markDelivered:", e.message);
    }
  }
}

// 3. Gestão de Estoques Multi-Produto
function getStockKey(produto) {
  return `stock:${produto || "muse-ia"}`;
}

async function popStockAccount(produto = "muse-ia") {
  // 1. Cloud DB persistente
  const db = await loadCloudDb();
  if (db && db.stocks && db.stocks[produto] && db.stocks[produto].length) {
    const item = db.stocks[produto].shift();
    await saveCloudDb(db);
    memoryStocks[produto] = db.stocks[produto];
    return item;
  }

  // 2. Vercel KV fallback
  const key = getStockKey(produto);
  if (hasKv()) {
    try {
      const raw = await kv.lpop(key);
      if (raw) return typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch (e) {
      console.warn("Aviso KV popStockAccount:", e.message);
    }
  }

  // 3. Memória local
  const list = memoryStocks[produto] || [];
  return list.shift() || null;
}

async function pushStockAccounts(accounts, produto = "muse-ia") {
  if (!accounts || !accounts.length) return 0;

  // 1. Cloud DB persistente
  const db = (await loadCloudDb()) || { stocks: { "muse-ia": [], "flow-ai-pro": [] }, sales: [], orders: {}, delivered: [] };
  if (!db.stocks) db.stocks = {};
  if (!db.stocks[produto]) db.stocks[produto] = [];
  db.stocks[produto].push(...accounts);
  await saveCloudDb(db);
  memoryStocks[produto] = db.stocks[produto];

  // 2. Vercel KV
  const key = getStockKey(produto);
  if (hasKv()) {
    try {
      await kv.rpush(key, ...accounts.map((a) => JSON.stringify(a)));
    } catch (e) {
      console.warn("Aviso KV pushStockAccounts:", e.message);
    }
  }

  return accounts.length;
}

async function stockCount(produto = "muse-ia") {
  const db = await loadCloudDb();
  if (db && db.stocks && db.stocks[produto]) {
    return db.stocks[produto].length;
  }

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
  const produtos = ["muse-ia", "flow-ai-pro"];
  const counts = {};
  for (const p of produtos) {
    counts[p] = await stockCount(p);
  }
  return counts;
}

async function getStockAccounts(produto = "muse-ia") {
  const db = await loadCloudDb();
  if (db && db.stocks && db.stocks[produto]) {
    return db.stocks[produto];
  }

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
  const db = await loadCloudDb();
  if (db && db.stocks && db.stocks[produto]) {
    if (index >= 0 && index < db.stocks[produto].length) {
      db.stocks[produto].splice(index, 1);
      await saveCloudDb(db);
      memoryStocks[produto] = db.stocks[produto];
      return true;
    }
  }

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

  // Cloud DB
  const db = (await loadCloudDb()) || { stocks: { "muse-ia": [], "flow-ai-pro": [] }, sales: [], orders: {}, delivered: [] };
  if (!db.sales) db.sales = [];
  db.sales.unshift(saleData);
  // Mantém os últimos 500 registros
  if (db.sales.length > 500) db.sales.length = 500;
  await saveCloudDb(db);

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
  const db = await loadCloudDb();
  if (db && db.sales) {
    memorySales = db.sales;
    return db.sales;
  }

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

async function clearSalesHistory() {
  memorySales = [];

  const db = (await loadCloudDb()) || { stocks: { "muse-ia": [], "flow-ai-pro": [] }, sales: [], orders: {}, delivered: [] };
  db.sales = [];
  await saveCloudDb(db);

  if (hasKv()) {
    try {
      await kv.del("sales:history");
    } catch (e) {
      console.warn("Aviso KV clearSalesHistory:", e.message);
    }
  }
  return true;
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
  clearSalesHistory,
  hasKv,
  hasCloudDb,
};
