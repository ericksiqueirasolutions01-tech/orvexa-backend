// GET /api/entrega?pagamento=aprovado&produto=flow-ai-pro&order_nsu=...
// Tela de entrega instantânea exibida para o cliente após aprovação do pagamento.
const { PRODUCTS, SITE_URL, WHATSAPP_URL, YOUTUBE_TUTORIAL_FLOW } = require("../lib/products");
const { getOrder } = require("../lib/store");

module.exports = async function handler(req, res) {
  const status = req.query.pagamento || "aprovado";
  const produtoKey = req.query.produto || "muse-ia";
  const orderNsu = req.query.order_nsu || "";

  let order = null;
  if (orderNsu) {
    try {
      order = await getOrder(orderNsu);
    } catch (e) {
      console.warn("Erro ao buscar pedido em api/entrega:", e.message);
    }
  }

  const deliveredItem = (order && order.delivered_item) || "";
  const produtoInfo = PRODUCTS[produtoKey] || { title: "Seu Acesso", short: "Acesso" };

  let deliveryContentHtml = "";

  // 1. MUSE IA
  if (produtoKey === "muse-ia") {
    let loginStr = "";
    let senhaStr = "";
    if (deliveredItem && deliveredItem.includes(";")) {
      const parts = deliveredItem.split(";");
      loginStr = parts[0].trim();
      senhaStr = parts[1].trim();
    }

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
      ` : `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">Seu login e senha foram enviados com sucesso para o seu e-mail! (Verifique a caixa de entrada e spam).</p>
      `}

      <div style="text-align:left;background:#121422;border:1px solid #1f233b;border-radius:12px;padding:20px;margin-top:16px;">
        <h3 style="color:#fff;font-size:16px;margin:0 0 12px;">🔐 Passo a Passo para Acessar:</h3>
        <ol style="color:#cbd5e1;font-size:14px;line-height:1.9;padding-left:20px;margin:0;">
          <li>Abra o navegador em <b>Janela Anônima</b> (para evitar conflito com sua conta Google existente).</li>
          <li>Acesse o site oficial: <a href="https://muse.ai/" target="_blank" style="color:#38bdf8;font-weight:bold;text-decoration:underline;">https://muse.ai/</a></li>
          <li>Clique em <b>Entrar com e-mail</b>.</li>
          <li>Informe o <b>e-mail fornecido acima</b>.</li>
          <li>Clique em <b>Entrar com senha</b>.</li>
          <li>Digite a <b>senha fornecida acima</b> e confirme.</li>
          <li>Pronto! Você já está logado com 1 bilhão de tokens para gerar imagens, vídeos e agentes!</li>
        </ol>
        <p style="color:#f59e0b;font-size:12px;margin:12px 0 0;line-height:1.5;">⚠️ <b>Atenção:</b> Não clique em "Entrar com Google". Use estritamente o e-mail e senha fornecidos.</p>
      </div>
    `;
  }

  // 2. Gemini Pro (Google Flow + AI Pro 18 meses)
  else if (produtoKey === "flow-ai-pro") {
    const linkUrl = deliveredItem && deliveredItem.startsWith("http") ? deliveredItem : "";

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
      ` : `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">Seu link exclusivo de ativação foi enviado para o seu e-mail! Você também pode ativá-lo diretamente pelo suporte no WhatsApp.</p>
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

  // 3. Super Duolingo
  else if (produtoKey === "super-duolingo") {
    const duoUrl = deliveredItem && deliveredItem.startsWith("http") ? deliveredItem : "";

    deliveryContentHtml = `
      ${duoUrl ? `
      <div style="background:#090a10;border:1px solid #3b4263;border-radius:12px;padding:24px;margin:20px 0;text-align:center;">
        <span style="display:inline-block;background:#58cc02;color:#fff;font-size:11px;font-weight:bold;padding:3px 8px;border-radius:4px;letter-spacing:1px;margin-bottom:12px;">SEU CONVITE SUPER DUOLINGO</span>
        
        <div style="margin:12px 0;">
          <a href="${duoUrl}" target="_blank" style="display:inline-block;background:#58cc02;color:#fff;font-weight:bold;padding:16px 28px;border-radius:10px;text-decoration:none;font-size:16px;box-shadow:0 8px 24px rgba(88,204,2,0.4);">
            👉 ACEITAR CONVITE SUPER DUOLINGO (1 ANO)
          </a>
        </div>
        
        <p style="color:#94a3b8;font-size:12px;word-break:break-all;margin-top:12px;">Link: <a href="${duoUrl}" target="_blank" style="color:#38bdf8;">${duoUrl}</a></p>
      </div>
      ` : `
      <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">Seu convite exclusivo do Super Duolingo foi enviado para o seu e-mail!</p>
      `}

      <div style="text-align:left;background:#121422;border:1px solid #1f233b;border-radius:12px;padding:20px;margin-top:16px;">
        <h3 style="color:#fff;font-size:16px;margin:0 0 12px;">📋 Como Entrar no Plano Super:</h3>
        <ol style="color:#cbd5e1;font-size:14px;line-height:1.9;padding-left:20px;margin:0;">
          <li>Abra o link de convite no navegador ou no celular.</li>
          <li>Faça login na sua conta existente do Duolingo.</li>
          <li>Aceite a entrada na turma / família do plano Super.</li>
          <li>Pronto! Você agora tem vidas infinitas e sem anúncios por 1 ano!</li>
        </ol>
      </div>
    `;
  }

  const titles = {
    aprovado: "🎉 Pagamento Aprovado com Sucesso!",
    erro: "❌ Pagamento não concluído",
    pendente: "⏳ Pagamento em análise",
  };

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
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

    ${SITE_URL ? `
      <p style="margin-top:20px;font-size:13px;">
        <a href="${SITE_URL}" style="color:#38bdf8;text-decoration:none;">← Voltar à loja principal</a>
      </p>
    ` : ""}
  </div>

  <script>
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
</html>`);
};
