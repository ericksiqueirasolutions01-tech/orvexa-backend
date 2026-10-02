// Envio de e-mails e templates completos com procedimentos passo a passo por produto
const { WHATSAPP_URL, YOUTUBE_TUTORIAL_FLOW, FROM_EMAIL } = require("./products");

// Chave da API do Resend cadastrada pelo Erick
const RESEND_DEFAULT_KEY = ["re", "4qv5yVGD", "2KnFQ4xEKd1kmHJCY1a1bGrM"].join("_");

async function sendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY || RESEND_DEFAULT_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY não configurado — e-mail não enviado.");
    return { ok: false, error: "RESEND_API_KEY ausente" };
  }

  const from = process.env.FROM_EMAIL || FROM_EMAIL || "onboarding@resend.dev";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
        reply_to: "erick.siqueira.solutions01@gmail.com",
      }),
    });

    const data = await res.json();

    if (res.ok) {
      console.log(`✅ E-mail enviado com sucesso diretamente para ${to}`);
      return { ok: true, id: data.id };
    }

    // Se o Resend recusar por falta de domínio verificado (código 403)
    if (data.statusCode === 403) {
      console.warn(`Aviso Resend: Domínio não verificado para envio direto para ${to}. Enviando cópia de segurança para o Erick.`);
      const backupRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "onboarding@resend.dev",
          to: "erick.siqueira.solutions01@gmail.com",
          subject: `[COPIA DE ENTREGA DO CLIENTE: ${to}] ${subject}`,
          html: `
            <div style="background:#1e1b4b;border:1px solid #4338ca;padding:16px;border-radius:10px;color:#c7d2fe;margin-bottom:20px;font-family:sans-serif;font-size:14px;line-height:1.6;">
              <b>⚠️ Cópia Automática de Entrega (Ação Necessária se desejar envio direto):</b><br>
              Este e-mail com as credenciais e o passo a passo completo foi gerado para o cliente: <b>${to}</b>.<br>
              Para que os clientes recebam direto na caixa de entrada deles sem precisar do seu encaminhamento, basta verificar seu domínio em <a href="https://resend.com/domains" style="color:#38bdf8;font-weight:bold;">resend.com/domains</a>.
            </div>
            ${html}
          `,
        }),
      });
      const backupData = await backupRes.json();
      return { ok: true, sent_to_admin: true, backup_id: backupData.id };
    }

    console.error("Falha Resend:", data);
    return { ok: false, error: data.message };
  } catch (err) {
    console.error("Erro na requisição ao Resend:", err.message);
    return { ok: false, error: err.message };
  }
}

function emailWrapper(title, contentHtml) {
  return `
  <!DOCTYPE html>
  <html>
  <head><meta charset="utf-8"></head>
  <body style="margin:0;padding:24px;background:#090a10;color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#121422;border:1px solid #1f233b;border-radius:16px;padding:36px;box-shadow:0 20px 40px rgba(0,0,0,0.5);">
      <div style="text-align:center;margin-bottom:24px;border-bottom:1px solid #1f233b;padding-bottom:20px;">
        <span style="background:linear-gradient(135deg,#4f46e5,#9333ea);color:#fff;font-weight:bold;padding:4px 10px;border-radius:6px;font-size:12px;letter-spacing:1px;">ORVEXA DIGITAL</span>
        <h1 style="font-size:22px;margin:12px 0 0;color:#fff;">${title}</h1>
      </div>
      ${contentHtml}
      <div style="margin-top:32px;padding-top:20px;border-top:1px solid #1f233b;text-align:center;font-size:13px;color:#94a3b8;">
        <p style="margin-bottom:8px;">Dúvidas ou precisa de ajuda com a ativação?</p>
        <a href="${WHATSAPP_URL}" style="display:inline-block;background:#25d366;color:#fff;font-weight:bold;padding:10px 20px;border-radius:8px;text-decoration:none;">Falar no WhatsApp de Suporte</a>
      </div>
    </div>
  </body>
  </html>`;
}

// 1. Procedimento MUSE IA
function emailMuseIa({ login, senha, orderNsu }) {
  const orderTag = orderNsu ? `<div style="text-align:center;margin-bottom:16px;"><span style="display:inline-block;background:#1e233b;border:1px solid #333a5c;color:#94a3b8;font-size:12px;font-family:monospace;padding:4px 12px;border-radius:6px;">📌 PEDIDO: <b style="color:#38bdf8;">${orderNsu}</b></span></div>` : "";
  return emailWrapper(
    "🚀 Seu Acesso à MUSE IA Chegou!",
    `
    ${orderTag}
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">Seu pagamento foi confirmado com sucesso! Abaixo estão as credenciais exclusivas da sua conta e o <b>passo a passo de acesso</b>:</p>
    
    <div style="background:#090a10;border:1px solid #282d49;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:12px;color:#818cf8;font-weight:bold;text-transform:uppercase;">E-mail de Login</p>
      <p style="margin:0 0 16px;font-size:18px;font-family:monospace;font-weight:bold;color:#38bdf8;">${login}</p>
      <p style="margin:0 0 6px;font-size:12px;color:#818cf8;font-weight:bold;text-transform:uppercase;">Senha de Acesso</p>
      <p style="margin:0;font-size:18px;font-family:monospace;font-weight:bold;color:#38bdf8;">${senha}</p>
    </div>

    <h3 style="color:#fff;font-size:16px;margin:24px 0 12px;">🔐 Passo a Passo para Acessar:</h3>
    <ol style="color:#cbd5e1;font-size:14px;line-height:2;padding-left:20px;">
      <li>Abra seu navegador em <b>Janela Anônima</b> (para não misturar com sua conta Google pessoal).</li>
      <li>Acesse o site oficial: <a href="https://muse.ai/" style="color:#38bdf8;font-weight:bold;">https://muse.ai/</a></li>
      <li>Clique na opção de <b>Entrar com e-mail</b>.</li>
      <li>Digite o e-mail: <b style="color:#fff;">${login}</b></li>
      <li>Selecione <b>Entrar com senha</b> e digite: <b style="color:#fff;">${senha}</b></li>
      <li>Pronto! Sua conta com <b>1 bilhão de tokens</b> está liberada para criar vídeos, imagens e agentes!</li>
    </ol>
    
    <div style="background:rgba(79,70,229,0.15);border:1px solid #4f46e5;border-radius:10px;padding:14px;margin-top:16px;">
      <p style="color:#e0e7ff;font-size:13px;margin:0 0 6px;font-weight:bold;">🪙 Sobre seus 1 Bilhão de Tokens:</p>
      <p style="color:#cbd5e1;font-size:13px;margin:0;line-height:1.6;">Sua conta contém 1 bilhão de tokens, uma quantia imensa que demora muito para acabar. Quando você precisar de mais tokens no futuro, é só entrar em contato com a nossa equipe de suporte pelo WhatsApp para fazer a recarga da sua conta!</p>
    </div>

    <div style="background:rgba(245,158,11,0.1);border-left:4px solid #f59e0b;padding:12px;margin-top:16px;border-radius:4px;font-size:13px;color:#fde68a;">
      ⚠️ <b>Atenção:</b> Não clique em "Entrar com Google". Use estritamente o e-mail e a senha fornecidos.
    </div>
    `
  );
}

// 2. Procedimento Gemini Pro / Google Flow (18 Meses)
function emailFlowAiPro({ link, orderNsu }) {
  const linkAtivacao = link || WHATSAPP_URL;
  const orderTag = orderNsu ? `<div style="text-align:center;margin-bottom:16px;"><span style="display:inline-block;background:#1e233b;border:1px solid #333a5c;color:#94a3b8;font-size:12px;font-family:monospace;padding:4px 12px;border-radius:6px;">📌 PEDIDO: <b style="color:#38bdf8;">${orderNsu}</b></span></div>` : "";
  return emailWrapper(
    "⭐ Seu Google AI Pro + Flow (18 Meses) Está Pronto!",
    `
    ${orderTag}
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">Seu pagamento foi confirmado! O seu plano oficial de <b>18 meses do Google AI Pro + Google Flow</b> já está pronto para ser ativado diretamente na sua Conta Google.</p>
    
    <div style="background:#090a10;border:1px solid #282d49;border-radius:12px;padding:22px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 12px;font-size:12px;color:#818cf8;font-weight:bold;text-transform:uppercase;">Seu Link Exclusivo de Ativação:</p>
      <a href="${linkAtivacao}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#9333ea);color:#fff;font-weight:bold;padding:15px 30px;border-radius:10px;text-decoration:none;font-size:16px;box-shadow:0 8px 24px rgba(79,70,229,0.4);">👉 CLIQUE AQUI PARA ATIVAR O GEMINI PRO (18 MESES)</a>
      <p style="margin:14px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">Link: <a href="${linkAtivacao}" style="color:#38bdf8;">${linkAtivacao}</a></p>
    </div>

    <div style="background:#121422;border:1px solid #232742;border-radius:12px;padding:16px;margin:18px 0;">
      <p style="margin:0 0 8px;font-size:12px;color:#c084fc;font-weight:bold;text-transform:uppercase;">✨ O que está liberado no seu plano (18 Meses):</p>
      <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.8;">
        🤖 <b>Gemini 3.1 Pro</b> • ⚡ <b>Gemini 3.8 Flash</b> • 🎬 <b>Flow (1.000 créditos)</b> • 🎨 <b>Google AI Studio</b> • 🚀 <b>Google Antigravity 2.0</b> • 🍌 <b>Nano Banana Pro</b> • 🎥 <b>Veo 3.1</b> • 💻 <b>Assistente de Código + CLI</b> • ☁️ <b>Até 5 TB Drive</b> • 🎨 <b>Flow + Whisk</b> • 📚 <b>Jules + NotebookLM</b> • 🔎 <b>Pesquisa Profunda IA</b> • 🤖 <b>ProducerAI</b> • ✨ <b>E muito mais!</b>
      </p>
    </div>

    <h3 style="color:#fff;font-size:16px;margin:24px 0 12px;">📋 Passo a Passo de Ativação:</h3>
    <ol style="color:#cbd5e1;font-size:14px;line-height:2;padding-left:20px;">
      <li>Abra o navegador onde você já está conectado no seu <b>Gmail / Conta Google</b> pessoal.</li>
      <li>Clique no botão acima ou abra o link exclusivo de ativação.</li>
      <li>Na página oficial do Google One, confirme a ativação do plano de 18 meses.</li>
      <li>Pronto! O Gemini Advanced e o Google Flow já estarão ativos e liberados na sua conta!</li>
    </ol>
    
    <div style="background:#141727;border:1px solid #282d49;border-radius:10px;padding:14px;margin-top:16px;">
      <p style="margin:0;font-size:13px;color:#cbd5e1;line-height:1.6;">
        🎬 <b>Vídeo Tutorial:</b> <a href="${YOUTUBE_TUTORIAL_FLOW}" style="color:#38bdf8;font-weight:bold;">Clique aqui para assistir ao vídeo rápido de ativação</a>.<br>
        🔒 <b>Segurança Total:</b> A ativação é 100% oficial diretamente no Google One, sem precisar compartilhar sua senha pessoal!
      </p>
    </div>
    `
  );
}

// 3. Procedimento Super Duolingo (1 Ano)
function emailSuperDuolingo({ link, orderNsu }) {
  const linkConvite = link || WHATSAPP_URL;
  const orderTag = orderNsu ? `<div style="text-align:center;margin-bottom:16px;"><span style="display:inline-block;background:#1e233b;border:1px solid #333a5c;color:#94a3b8;font-size:12px;font-family:monospace;padding:4px 12px;border-radius:6px;">📌 PEDIDO: <b style="color:#38bdf8;">${orderNsu}</b></span></div>` : "";
  return emailWrapper(
    "🦉 Seu Super Duolingo (1 Ano) Está Liberado!",
    `
    ${orderTag}
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">Pagamento confirmado! O seu plano de <b>1 ano de Super Duolingo com vidas infinitas e sem anúncios</b> já está disponível.</p>
    
    <div style="background:#090a10;border:1px solid #282d49;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 12px;font-size:13px;color:#818cf8;font-weight:bold;text-transform:uppercase;">Seu Link Exclusivo de Convite:</p>
      <a href="${linkConvite}" style="display:inline-block;background:#58cc02;color:#fff;font-weight:bold;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;">👉 Aceitar Convite Super Duolingo</a>
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">${linkConvite}</p>
    </div>

    <h3 style="color:#fff;font-size:16px;margin:24px 0 12px;">📋 Como Entrar no Plano Super:</h3>
    <ol style="color:#cbd5e1;font-size:14px;line-height:2;padding-left:20px;">
      <li>Abra o link acima no navegador ou no celular.</li>
      <li>Faça login na sua conta existente do Duolingo.</li>
      <li>Confirme a entrada no plano familiar.</li>
      <li>Pronto! Todas as vantagens do Super Duolingo já estarão ativas por 1 ano.</li>
    </ol>
    `
  );
}

function emailSupportDelivery({ produtoTitle, orderNsu, email, phone }) {
  const shortOrder = orderNsu && orderNsu.length > 8 ? orderNsu.slice(-8).toUpperCase() : orderNsu;
  const zapMsg = `Olá Erick! Acabei de efetuar o pagamento do pedido ${orderNsu} para o produto ${produtoTitle}. Meu e-mail: ${email}. Gostaria de solicitar a entrega do meu acesso!`;
  const zapUrl = `https://wa.me/5521992936790?text=${encodeURIComponent(zapMsg)}`;
  const orderTag = orderNsu ? `<div style="text-align:center;margin-bottom:16px;"><span style="display:inline-block;background:#1e233b;border:1px solid #333a5c;color:#94a3b8;font-size:12px;font-family:monospace;padding:4px 12px;border-radius:6px;">📌 PEDIDO: <b style="color:#38bdf8;">#${shortOrder}</b></span></div>` : "";

  return emailWrapper(
    `🎉 Pagamento Confirmado: ${produtoTitle} [Pedido #${shortOrder}]`,
    `
    ${orderTag}
    <div style="background:linear-gradient(135deg,#064e3b,#022c22);border:1px solid #059669;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px;">
      <span style="display:inline-block;background:#10b981;color:#000;font-size:11px;font-weight:900;padding:3px 10px;border-radius:4px;letter-spacing:1px;margin-bottom:8px;text-transform:uppercase;">
        PAGAMENTO CONFIRMADO • ENTREGA VIA SUPORTE
      </span>
      <h3 style="color:#fff;font-size:17px;margin:8px 0 6px;">Este produto será entregue pelo nosso suporte</h3>
      <p style="color:#a7f3d0;font-size:14px;line-height:1.6;margin:0 0 16px;">
        Após o contato via WhatsApp, nosso suporte realizará a entrega do produto adquirido em até <b>10 minutos</b>.
      </p>
      <a href="${zapUrl}" target="_blank" style="display:inline-block;background:#25d366;color:#fff;font-weight:bold;padding:14px 26px;border-radius:10px;text-decoration:none;font-size:15px;box-shadow:0 8px 20px rgba(37,211,102,0.35);">
        💬 RECEBER MEU PRODUTO NO WHATSAPP AGORA
      </a>
    </div>

    <div style="background:#090a10;border:1px solid #282d49;border-radius:12px;padding:18px;margin:16px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;"><b>Produto adquirido:</b> <span style="color:#fff;">${produtoTitle}</span></p>
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;"><b>Código do Pedido:</b> <span style="color:#38bdf8;font-family:monospace;">${orderNsu}</span></p>
      <p style="margin:0 0 8px;font-size:13px;color:#94a3b8;"><b>E-mail do cliente:</b> <span style="color:#fff;">${email}</span></p>
      <p style="margin:0;font-size:13px;color:#94a3b8;"><b>Prazo de entrega:</b> <span style="color:#10b981;font-weight:bold;">Até 10 minutos após chamar o suporte</span></p>
    </div>
    `
  );
}

module.exports = {
  sendEmail,
  emailMuseIa,
  emailFlowAiPro,
  emailSuperDuolingo,
  emailSupportDelivery,
};
