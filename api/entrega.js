// GET /api/entrega?pagamento=aprovado&produto=flow-ai-pro&order_nsu=...&email=...&phone=...
// Tela de entrega instantânea exibida para o cliente após aprovação do pagamento.
const { PRODUCTS, SITE_URL, WHATSAPP_URL, YOUTUBE_TUTORIAL_FLOW, ADMIN_EMAIL, isValidEmail } = require("../lib/products");
const { getOrder, deliverOrder, markEmailSent } = require("../lib/store");
const {
  sendEmail,
  emailMuseIa,
  emailFlowAiPro,
  emailBuyerManualDelivery,
  emailAdminManualDelivery,
} = require("../lib/email");

module.exports = async function handler(req, res) {
  const status = req.query.pagamento || "aprovado";
  let produtoKey = req.query.produto || "muse-ia";
  const orderNsu = req.query.order_nsu || "";
  let buyerEmail = req.query.email || "";
  let buyerPhone = req.query.phone || "";

  let order = null;
  if (orderNsu) {
    try {
      order = await getOrder(orderNsu);
      if (order) {
        if (order.produto) produtoKey = order.produto;
        if (order.email && !buyerEmail) buyerEmail = order.email;
        if (order.phone && !buyerPhone) buyerPhone = order.phone;
      }
    } catch (e) {
      console.warn("Erro ao buscar pedido em api/entrega:", e.message);
    }
  }

  // Se produtoKey ainda não for reconhecido, deduz pelo orderNsu
  if (!produtoKey || !PRODUCTS[produtoKey]) {
    if (orderNsu.startsWith("muse-ia")) produtoKey = "muse-ia";
    else if (orderNsu.startsWith("flow-ai-pro")) produtoKey = "flow-ai-pro";
    else if (orderNsu.startsWith("lovable-pro")) produtoKey = "lovable-pro";
    else if (orderNsu.startsWith("duolingo-super")) produtoKey = "duolingo-super";
    else if (orderNsu.startsWith("capcut-pro")) produtoKey = "capcut-pro";
    else if (orderNsu.startsWith("manus-mensal")) produtoKey = "manus-mensal";
    else produtoKey = "muse-ia";
  }

  let deliveredItem = (order && order.delivered_item) || "";
  let deliveryResult = null;

  // Se o pagamento foi aprovado, realiza entrega atômica e idempotente
  if (status === "aprovado" && orderNsu) {
    try {
      deliveryResult = await deliverOrder({
        orderNsu,
        transactionNsu: (order && order.transaction_nsu) || "",
        produto: produtoKey,
        email: buyerEmail,
        phone: buyerPhone,
      });

      deliveredItem = deliveryResult.deliveredItem;
      if (deliveryResult.produto) produtoKey = deliveryResult.produto;
      if (deliveryResult.email && !buyerEmail) buyerEmail = deliveryResult.email;
      if (deliveryResult.phone && !buyerPhone) buyerPhone = deliveryResult.phone;

      // Dispara envio de e-mail complementar apenas se ainda NÃO foi enviado (pelo webhook ou outra requisição)
      if (!deliveryResult.emailSent) {
        const prodObj = PRODUCTS[produtoKey] || { title: "Produto Digital", short: "Produto" };
        const shortOrder = orderNsu.length > 8 ? orderNsu.slice(-8).toUpperCase() : orderNsu;

        if (deliveryResult.isManualDelivery) {
          // 1. E-mail para o comprador
          if (buyerEmail && isValidEmail(buyerEmail)) {
            try {
              await sendEmail(
                buyerEmail,
                `⏳ ${prodObj.title} — entrega pelo nosso suporte`,
                emailBuyerManualDelivery({
                  produtoTitle: prodObj.title,
                  orderNsu,
                  email: buyerEmail,
                  phone: buyerPhone,
                })
              );
            } catch (errM) {
              console.warn("Aviso envio de e-mail comprador em api/entrega:", errM.message);
            }
          }

          // 2. E-mail para o ADMIN com formato estrito
          const adminRecipient = process.env.ADMIN_EMAIL || ADMIN_EMAIL || "erick.siqueira.solutions01@gmail.com";
          try {
            await sendEmail(
              adminRecipient,
              `🛠️ ENTREGA MANUAL — ${prodObj.title} — pedido ${orderNsu}`,
              emailAdminManualDelivery({
                produtoTitle: prodObj.title,
                orderNsu,
                buyerEmail,
                buyerPhone,
                transactionNsu: (order && order.transaction_nsu) || "",
              })
            );
          } catch (errAdm) {
            console.warn("Aviso envio de e-mail admin em api/entrega:", errAdm.message);
          }

          await markEmailSent(orderNsu);
        } else if (buyerEmail && isValidEmail(buyerEmail) && deliveredItem && !deliveredItem.startsWith("⚠️")) {
          // Produtos de estoque automático (quando estoque disponível)
          if (produtoKey === "muse-ia" && deliveredItem.includes(";")) {
            const [l, s] = deliveredItem.split(";");
            await sendEmail(
              buyerEmail,
              `🚀 Seu Acesso à ${prodObj.short} Foi Liberado! [Pedido #${shortOrder}]`,
              emailMuseIa({ login: l, senha: s, orderNsu })
            );
            await markEmailSent(orderNsu);
          } else if (produtoKey === "flow-ai-pro") {
            await sendEmail(
              buyerEmail,
              `⭐ Seu Google AI Pro + Flow (18 Meses) Está Pronto! [Pedido #${shortOrder}]`,
              emailFlowAiPro({ link: deliveredItem, orderNsu })
            );
            await markEmailSent(orderNsu);
          }
        }
      }
    } catch (ePop) {
      console.error("Erro na entrega atômica em api/entrega:", ePop.message);
    }
  }

  const produtoInfo = PRODUCTS[produtoKey] || { title: "Seu Acesso", short: "Acesso", priceBRL: 59.99 };
  const isManualFlow = Boolean((deliveryResult && deliveryResult.isManualDelivery) || (produtoInfo.delivery === "support" || produtoInfo.itemType === "support"));
  let deliveryContentHtml = "";

  // 1. MUSE IA (Conta com 1 Bilhão de Tokens) — apenas se tiver estoque automático
  if (produtoKey === "muse-ia" && !isManualFlow) {
    let loginStr = "";
    let senhaStr = "";
    if (deliveredItem && deliveredItem.includes(";")) {
      const parts = deliveredItem.split(";");
      loginStr = parts[0].trim();
      senhaStr = parts[1].trim();
    }

    const zapMuseMsg = `🚀 *SEU ACESSO MUSE IA ESTÁ LIBERADO!*

Olá Erick! Acabei de garantir o *MUSE IA (1 Bilhão de Tokens)* pelo site!
📌 *Pedido:* ${orderNsu}
👤 *E-mail:* ${buyerEmail}

🔑 *Meus dados de acesso:*
📧 *E-mail da Conta:* ${loginStr}
🔑 *Senha:* ${senhaStr}

📋 *Passo a Passo de Acesso:*
1. Abrir o navegador em *Janela Anônima*.
2. Acessar: https://muse.ai/
3. Clicar em *Entrar com e-mail* (não clicar em Google).
4. Informar o e-mail e senha acima.
5. Pronto! Conta com 1 bilhão de tokens ativa!

Gostaria de manter o procedimento e o suporte salvo aqui no meu WhatsApp!`;

    deliveryContentHtml = `
      ${loginStr ? `
      <div style="background:#090a10;border:1px solid #3b4263;border-radius:12px;padding:20px;margin:20px 0;text-align:left;">
        <span style="display:inline-block;background:#4f46e5;color:#fff;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px;letter-spacing:1px;margin-bottom:12px;">SUA CONTA MUSE IA</span>
        
        <div style="margin-bottom:14px;">
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">E-mail da Conta:</p>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" readonly value="${loginStr}" id="muse-login" style="flex:1;background:#151524;border:1px solid #2a2a44;color:#38bdf8;padding:10px 12px;border-radius:8px;font-family:monospace;font-size:15px;font-weight:bold;">
            <button onclick="copiar('muse-login', this)" style="background:#2a2a44;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">Copiar</button>
          </div>
        </div>

        <div>
          <p style="margin:0 0 4px;font-size:12px;color:#94a3b8;font-weight:bold;text-transform:uppercase;">Senha:</p>
          <div style="display:flex;gap:8px;align-items:center;">
            <input type="text" readonly value="${senhaStr}" id="muse-senha" style="flex:1;background:#151524;border:1px solid #2a2a44;color:#38bdf8;padding:10px 12px;border-radius:8px;font-family:monospace;font-size:15px;font-weight:bold;">
            <button onclick="copiar('muse-senha', this)" style="background:#2a2a44;color:#fff;border:0;padding:10px 16px;border-radius:8px;cursor:pointer;font-weight:bold;font-size:13px;">Copiar</button>
          </div>
        </div>
      </div>

      <div style="background:linear-gradient(135deg,#064e3b,#022c22);border:1px solid #059669;border-radius:12px;padding:18px 16px;margin:18px 0;text-align:center;">
        <span style="display:inline-block;background:#10b981;color:#000;font-size:10px;font-weight:900;padding:2px 8px;border-radius:4px;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase;">
          📲 RECEBER NO SEU WHATSAPP
        </span>
        <h4 style="color:#fff;font-size:15px;margin:0 0 6px;">Receber Procedimento e Acesso no WhatsApp</h4>
        <p style="color:#a7f3d0;font-size:13px;line-height:1.5;margin:0 0 12px;">
          Toque no botão abaixo para receber todos os dados da conta e o passo a passo direto no seu WhatsApp para não perder:
        </p>
        <a href="https://wa.me/5521992936790?text=${encodeURIComponent(zapMuseMsg)}" target="_blank" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#25d366;color:#fff;font-weight:bold;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px;box-shadow:0 6px 18px rgba(37,211,102,0.35);width:100%;max-width:360px;">
          <span>💬</span> RECEBER PROCEDIMENTO NO WHATSAPP
        </a>
      </div>
      ` : `
      <div style="background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.35);border-radius:14px;padding:24px 20px;margin:20px 0;text-align:center;">
        <span style="display:inline-block;background:#eab308;color:#000;font-size:11px;font-weight:900;padding:3px 10px;border-radius:4px;letter-spacing:1px;margin-bottom:12px;text-transform:uppercase;">
          PAGAMENTO CONFIRMADO • ATIVAÇÃO IMEDIATA
        </span>
        <h2 style="color:#fff;font-size:18px;margin:0 0 10px;font-weight:800;">Seu Acesso Está Liberado!</h2>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 16px;">
          Confirmamos com sucesso seu pagamento do <b>${produtoInfo.title}</b>.<br>
          Para receber seu login e senha imediatamente, toque no botão abaixo e fale com o Erick no WhatsApp:
        </p>
        <a href="https://wa.me/5521992936790?text=${encodeURIComponent(`Olá Erick! Acabei de pagar pelo ${produtoInfo.title} (Pedido: ${orderNsu || 'Confirmado'}, E-mail: ${buyerEmail}) e gostaria de receber meu login e senha agora!`)}"
           target="_blank"
           style="display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#25d366;color:#fff;font-weight:bold;padding:16px 24px;border-radius:10px;text-decoration:none;font-size:15px;box-shadow:0 8px 24px rgba(37,211,102,0.4);width:100%;max-width:390px;">
          <span>💬</span> RECEBER MEU LOGIN NO WHATSAPP AGORA
        </a>
        <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">
          Atendimento direto com o Erick • Envio em minutos!
        </p>
      </div>
      `}

      <div style="text-align:left;background:#121422;border:1px solid #1f233b;border-radius:12px;padding:20px;margin-top:16px;">
        <h3 style="color:#fff;font-size:16px;margin:0 0 12px;">🔐 Passo a Passo para Acessar:</h3>
        <ol style="color:#cbd5e1;font-size:14px;line-height:1.9;padding-left:20px;margin:0;">
          <li>Abra o navegador em <b>Janela Anônima</b> (para evitar conflito com sua conta Google existente).</li>
          <li>Acesse o site oficial: <a href="https://muse.ai/" target="_blank" style="color:#38bdf8;font-weight:bold;text-decoration:underline;">https://muse.ai/</a></li>
          <li>Clique em <b>Entrar com e-mail</b>.</li>
          <li>Informe o <b>e-mail fornecido</b>.</li>
          <li>Clique em <b>Entrar com senha</b>.</li>
          <li>Digite a <b>senha fornecida</b> e confirme.</li>
          <li>Pronto! Você já está logado com <b>1 bilhão de tokens</b> prontos para gerar imagens, vídeos e agentes!</li>
        </ol>
        <div style="background:rgba(79,70,229,0.15);border:1px solid #4f46e5;border-radius:10px;padding:14px;margin-top:14px;">
          <p style="color:#e0e7ff;font-size:13px;margin:0 0 6px;font-weight:bold;">🪙 Sobre seus 1 Bilhão de Tokens:</p>
          <p style="color:#cbd5e1;font-size:13px;margin:0;line-height:1.6;">Sua conta contém 1 bilhão de tokens, uma quantia imensa que demora muito para acabar. Quando você precisar de mais tokens no futuro, é só entrar em contato com a nossa equipe de suporte pelo WhatsApp para fazer a recarga da sua conta!</p>
        </div>
        <p style="color:#f59e0b;font-size:12px;margin:12px 0 0;line-height:1.5;">⚠️ <b>Atenção:</b> Não clique em "Entrar com Google". Use estritamente o e-mail e senha fornecidos.</p>
      </div>
    `;
  }

  // 2. Gemini Pro (Google Flow + AI Pro 18 meses) — apenas se tiver estoque automático
  else if (produtoKey === "flow-ai-pro" && !isManualFlow) {
    const linkUrl = deliveredItem && deliveredItem.startsWith("http") ? deliveredItem : "";

    const zapGeminiMsg = `⭐ *SEU GOOGLE AI PRO + FLOW (18 MESES) ESTÁ PRONTO!*

Olá Erick! Acabei de garantir o *Google Flow + AI Pro (18 Meses)* pelo site!
📌 *Pedido:* ${orderNsu}
👤 *E-mail:* ${buyerEmail}

👉 *Meu Link de Ativação:*
${linkUrl}

✨ *Suíte Inclusa:* Gemini 3.1 Pro, Flow (1.000 créditos), Antigravity 2.0, Veo 3.1, AI Studio, 5TB Drive e mais!

📋 *Passo a Passo de Ativação:*
1. Conectar na sua conta Google / Gmail pessoal.
2. Abrir o link de ativação exclusivo acima.
3. No Google One, confirmar a ativação do plano de 18 meses.
4. O Gemini Advanced e o Google Flow já estarão liberados!
🎬 *Tutorial em vídeo:* https://www.youtube.com/shorts/6yournVyUWI

Gostaria de manter o procedimento e o suporte salvo aqui no meu WhatsApp!`;

    deliveryContentHtml = `
      ${linkUrl ? `
      <div style="background:#090a10;border:1px solid #3b4263;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
        <span style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#9333ea);color:#fff;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px;letter-spacing:1px;margin-bottom:12px;">SEU LINK DE ATIVAÇÃO EXCLUSIVO</span>
        
        <div style="margin:12px 0;">
          <a href="${linkUrl}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#9333ea);color:#fff;font-weight:bold;padding:16px 28px;border-radius:10px;text-decoration:none;font-size:16px;box-shadow:0 8px 24px rgba(79,70,229,0.4);">
            👉 CLIQUE AQUI PARA ATIVAR O GEMINI PRO (18 MESES)
          </a>
        </div>
        
        <p style="color:#94a3b8;font-size:12px;word-break:break-all;margin-top:12px;">Link: <a href="${linkUrl}" target="_blank" style="color:#38bdf8;">${linkUrl}</a></p>
      </div>

      <div style="background:#121422;border:1px solid #232742;border-radius:12px;padding:16px;margin:16px 0;text-align:left;">
        <p style="margin:0 0 8px;font-size:12px;color:#c084fc;font-weight:bold;text-transform:uppercase;">✨ Suíte Google AI Pro Inclusa (18 Meses):</p>
        <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.8;">
          🤖 <b>Gemini 3.1 Pro</b> • ⚡ <b>Gemini 3.8 Flash</b> • 🎬 <b>Flow (1.000 créditos)</b> • 🎨 <b>Google AI Studio</b> • 🚀 <b>Antigravity 2.0</b> • 🍌 <b>Nano Banana Pro</b> • 🎥 <b>Veo 3.1</b> • 💻 <b>Assistente de Código + CLI</b> • ☁️ <b>Até 5 TB Drive</b> • 🎨 <b>Whisk</b> • 📚 <b>Jules + NotebookLM</b> • 🔎 <b>Pesquisa Profunda IA</b> • 🤖 <b>ProducerAI</b> • ✨ <b>E muito mais!</b>
        </p>
      </div>

      <div style="background:linear-gradient(135deg,#064e3b,#022c22);border:1px solid #059669;border-radius:12px;padding:18px 16px;margin:18px 0;text-align:center;">
        <span style="display:inline-block;background:#10b981;color:#000;font-size:10px;font-weight:900;padding:2px 8px;border-radius:4px;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase;">
          📲 RECEBER NO SEU WHATSAPP
        </span>
        <h4 style="color:#fff;font-size:15px;margin:0 0 6px;">Receber Procedimento e Link no WhatsApp</h4>
        <p style="color:#a7f3d0;font-size:13px;line-height:1.5;margin:0 0 12px;">
          Toque no botão abaixo para receber o link exclusivo e o tutorial de ativação direto no seu WhatsApp para não perder:
        </p>
        <a href="https://wa.me/5521992936790?text=${encodeURIComponent(zapGeminiMsg)}" target="_blank" style="display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#25d366;color:#fff;font-weight:bold;padding:12px 20px;border-radius:8px;text-decoration:none;font-size:14px;box-shadow:0 6px 18px rgba(37,211,102,0.35);width:100%;max-width:360px;">
          <span>💬</span> RECEBER PROCEDIMENTO NO WHATSAPP
        </a>
      </div>
      ` : `
      <div style="background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.35);border-radius:14px;padding:24px 20px;margin:20px 0;text-align:center;">
        <span style="display:inline-block;background:#eab308;color:#000;font-size:11px;font-weight:900;padding:3px 10px;border-radius:4px;letter-spacing:1px;margin-bottom:12px;text-transform:uppercase;">
          PAGAMENTO CONFIRMADO • ATIVAÇÃO IMEDIATA
        </span>
        <h2 style="color:#fff;font-size:18px;margin:0 0 10px;font-weight:800;">Seu Acesso Está Liberado!</h2>
        <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 16px;">
          Confirmamos com sucesso seu pagamento do <b>${produtoInfo.title}</b>.<br>
          Para receber seu link de ativação exclusivo agora mesmo, toque no botão abaixo e fale com o Erick no WhatsApp:
        </p>
        <a href="https://wa.me/5521992936790?text=${encodeURIComponent(`Olá Erick! Acabei de pagar pelo ${produtoInfo.title} (Pedido: ${orderNsu || 'Confirmado'}, E-mail: ${buyerEmail}) e gostaria de receber meu link de ativação agora!`)}"
           target="_blank"
           style="display:inline-flex;align-items:center;justify-content:center;gap:8px;background:#25d366;color:#fff;font-weight:bold;padding:16px 24px;border-radius:10px;text-decoration:none;font-size:15px;box-shadow:0 8px 24px rgba(37,211,102,0.4);width:100%;max-width:390px;">
          <span>💬</span> RECEBER MEU LINK NO WHATSAPP AGORA
        </a>
        <p style="color:#94a3b8;font-size:12px;margin:12px 0 0;">
          Atendimento direto com o Erick • Envio em minutos!
        </p>
      </div>
      `}

      <div style="text-align:left;background:#121422;border:1px solid #1f233b;border-radius:12px;padding:20px;margin-top:16px;">
        <h3 style="color:#fff;font-size:16px;margin:0 0 12px;">📋 Passo a Passo de Ativação:</h3>
        <ol style="color:#cbd5e1;font-size:14px;line-height:1.9;padding-left:20px;margin:0;">
          <li>Certifique-se de estar conectado no seu Gmail / Conta Google pessoal.</li>
          <li>Clique no botão acima ou abra o link de ativação exclusivo.</li>
          <li>Na página oficial do Google One, confirme a ativação do plano de 18 meses.</li>
          <li>Pronto! O Gemini Advanced e o Google Flow já estão ativos na sua conta!</li>
        </ol>
        <p style="margin:12px 0 0;font-size:13px;color:#94a3b8;">
          🎬 Assista ao tutorial rápido de ativação <a href="${YOUTUBE_TUTORIAL_FLOW}" target="_blank" style="color:#38bdf8;font-weight:bold;">clicando aqui</a>.
        </p>
      </div>
    `;
  }

  // 3. Produtos Entregues via Suporte WhatsApp (Lovable, Duolingo, CapCut, Manus, etc.)
  else {
    const zapMsg = `Olá Erick! Acabei de efetuar o pagamento do pedido ${orderNsu} para o produto ${produtoInfo.title}. Meu e-mail: ${buyerEmail}. Gostaria de solicitar a entrega do meu acesso!`;
    const zapUrl = `https://wa.me/5521992936790?text=${encodeURIComponent(zapMsg)}`;
    const productLogo = produtoInfo.logo || "assets/logo-prime-digital.png";
    const shortOrderTag = orderNsu ? (orderNsu.length > 8 ? orderNsu.slice(-8).toUpperCase() : orderNsu) : "OK";

    deliveryContentHtml = `
      <div style="background:linear-gradient(135deg,rgba(6,78,59,0.35),rgba(2,44,34,0.6));border:2px solid #10b981;border-radius:16px;padding:28px 22px;margin:20px 0;text-align:center;box-shadow:0 12px 32px rgba(16,185,129,0.15);">
        <span style="display:inline-block;background:#10b981;color:#000;font-size:11px;font-weight:900;padding:4px 12px;border-radius:4px;letter-spacing:1.5px;margin-bottom:14px;text-transform:uppercase;">
          PAGAMENTO CONFIRMADO • ENTREGA VIA SUPORTE
        </span>

        <div style="display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:14px;">
          <div style="width:58px;height:58px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.12);border-radius:14px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
            <img src="${productLogo}" alt="${produtoInfo.title}" style="width:75%;height:75%;object-fit:contain;">
          </div>
          <div style="text-align:left;">
            <h2 style="color:#fff;font-size:20px;margin:0 0 2px;font-weight:800;">${produtoInfo.title}</h2>
            <span style="font-size:13px;color:#38bdf8;font-weight:600;">Status: Aprovado • Pedido #${shortOrderTag}</span>
          </div>
        </div>

        <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(16,185,129,0.35);border-radius:12px;padding:20px;margin:18px 0;text-align:left;">
          <h3 style="color:#10b981;font-size:17px;margin:0 0 10px;font-weight:800;display:flex;align-items:center;gap:8px;">
            <span>✅</span> Pagamento confirmado! Sua entrega será feita pelo nosso suporte.
          </h3>
          <p style="color:#e2e8f0;font-size:15px;line-height:1.65;margin:0 0 14px;">
            <b>Este produto será entregue pelo nosso suporte.</b><br>
            O cliente deverá clicar no botão de contato ou acessar o WhatsApp do suporte para solicitar a entrega. Após o contato, nosso suporte realizará a entrega do produto adquirido em até <b>10 minutos</b>.
          </p>
          <div style="display:flex;gap:16px;flex-wrap:wrap;font-size:13px;color:#94a3b8;border-top:1px solid rgba(255,255,255,0.08);padding-top:10px;">
            <span>📌 <b>Pedido:</b> <code style="color:#38bdf8;background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:4px;">${orderNsu}</code></span>
            <span>👤 <b>E-mail:</b> <span style="color:#fff;">${buyerEmail || 'Confirmado'}</span></span>
          </div>
        </div>

        <div style="margin:20px 0 10px;">
          <a href="${zapUrl}"
             target="_blank"
             style="display:inline-flex;align-items:center;justify-content:center;gap:10px;background:#25d366;color:#062b16;font-weight:900;padding:18px 32px;border-radius:12px;text-decoration:none;font-size:16px;box-shadow:0 8px 24px rgba(37,211,102,0.45);width:100%;max-width:440px;transition:transform 0.2s;">
            <span style="font-size:22px;">💬</span> SOLICITAR ENTREGA NO WHATSAPP AGORA
          </a>
        </div>
        <p style="color:#94a3b8;font-size:12.5px;margin:10px 0 0;">
          ⚡ Atendimento ágil • Envio do seu produto em até <b>10 minutos</b> após seu contato
        </p>
      </div>
    `;
  }

  const titles = {
    aprovado: "🎉 Pagamento Aprovado com Sucesso!",
    erro: "❌ Pagamento não concluído",
    pendente: "⏳ Pagamento em análise",
  };

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  const finalHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Seu Produto Está Pronto — Orvexa</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #090a10;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      padding: 20px 16px;
    }
    .card {
      width: 100%;
      max-width: 580px;
      background: #121422;
      border: 1px solid #1f233b;
      border-radius: 16px;
      padding: 32px 24px;
      box-shadow: 0 20px 50px rgba(0,0,0,0.6);
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="card">
    <div style="margin-bottom:16px;">
      <span style="background:rgba(34,197,94,0.15);color:#22c55e;border:1px solid rgba(34,197,94,0.3);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;letter-spacing:0.5px;">PAGAMENTO CONFIRMADO</span>
    </div>
    
    <h1 style="font-size:22px;margin:0 0 8px;color:#fff;">${titles[status] || "Seu Acesso Foi Liberado!"}</h1>
    <p style="color:#94a3b8;font-size:14px;margin:0 0 20px;">Produto: <b style="color:#fff;">${produtoInfo.title}</b></p>

    ${status === "aprovado" ? deliveryContentHtml : `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">Estamos processando sua solicitação. Se tiver dúvidas, fale conosco pelo WhatsApp.</p>
    `}

    <div style="margin-top:28px;padding-top:20px;border-top:1px solid #1f233b;">
      <p style="color:#94a3b8;font-size:13px;margin:0 0 12px;">Dúvidas ou precisa de suporte rápido com seu acesso?</p>
      <a href="${WHATSAPP_URL}" target="_blank" style="display:inline-block;background:#25d366;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:14px;box-shadow:0 6px 16px rgba(37,211,102,0.35);">
        💬 Falar no WhatsApp com o Erick (Suporte VIP)
      </a>
    </div>

    <div style="margin-top:20px;background:rgba(79,70,229,0.12);border:1px solid rgba(79,70,229,0.3);border-radius:10px;padding:14px;font-size:13px;color:#cbd5e1;line-height:1.6;">
      💡 <b>Dica Importante:</b> Se fechar esta página, você pode consultar seus acessos e links a qualquer momento na página <a href="/meus-pedidos.html?email=${encodeURIComponent(buyerEmail)}" style="color:#38bdf8;font-weight:bold;text-decoration:underline;">Meus Acessos</a> usando seu e-mail.
    </div>

    ${SITE_URL ? `
      <p style="margin-top:20px;font-size:13px;">
        <a href="${SITE_URL}" style="color:#38bdf8;text-decoration:none;">← Voltar à loja principal</a>
      </p>
    ` : ""}
  </div>

  <script>
    try {
      if ('${buyerEmail}') {
        localStorage.setItem('orvexa_buyer_email', '${buyerEmail}');
      }
    } catch(e) {}

    function copiar(id, btn) {
      var input = document.getElementById(id);
      if (!input) return;
      input.select();
      input.setSelectionRange(0, 99999);
      navigator.clipboard.writeText(input.value);
      var orig = btn.textContent;
      btn.textContent = "✅ Copiado!";
      setTimeout(function() { btn.textContent = orig; }, 2000);
    }
  </script>
</body>
</html>`;

  if (typeof res.status === "function") {
    res.status(200);
  }
  if (typeof res.send === "function") {
    return res.send(finalHtml);
  }
  return res.end(finalHtml);
};
