// Envio de e-mails e templates completos com procedimentos passo a passo por produto
const { WHATSAPP_URL, YOUTUBE_TUTORIAL_FLOW, FROM_EMAIL } = require("./products");

async function sendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY não configurado — e-mail não enviado.");
    return { ok: false, error: "RESEND_API_KEY ausente" };
  }
  const from = process.env.FROM_EMAIL || FROM_EMAIL || "onboarding@resend.dev";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend falhou (${res.status}): ${err}`);
  }
  return res.json();
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
function emailMuseIa({ login, senha }) {
  return emailWrapper(
    "🚀 Seu Acesso à MUSE IA Chegou!",
    `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">Seu pagamento foi confirmado! Abaixo estão as credenciais exclusivas da sua conta e o <b>procedimento obrigatório</b> para acessar:</p>
    
    <div style="background:#090a10;border:1px solid #282d49;border-radius:12px;padding:20px;margin:20px 0;">
      <p style="margin:0 0 6px;font-size:12px;color:#818cf8;font-weight:bold;text-transform:uppercase;">E-mail de Login</p>
      <p style="margin:0 0 16px;font-size:18px;font-family:monospace;font-weight:bold;color:#fff;">${login}</p>
      <p style="margin:0 0 6px;font-size:12px;color:#818cf8;font-weight:bold;text-transform:uppercase;">Senha de Acesso</p>
      <p style="margin:0;font-size:18px;font-family:monospace;font-weight:bold;color:#fff;">${senha}</p>
    </div>

    <h3 style="color:#fff;font-size:16px;margin:24px 0 12px;">🔐 Passo a Passo para Acessar:</h3>
    <ol style="color:#cbd5e1;font-size:14px;line-height:2;padding-left:20px;">
      <li>Abra seu navegador em <b>Janela Anônima</b> (para não misturar com sua conta Google pessoal).</li>
      <li>Acesse o site oficial: <a href="https://muse.ai/" style="color:#38bdf8;font-weight:bold;">https://muse.ai/</a></li>
      <li>Clique na opção de <b>Entrar com e-mail</b>.</li>
      <li>Digite o e-mail: <b style="color:#fff;">${login}</b></li>
      <li>Selecione <b>Entrar com senha</b> e digite: <b style="color:#fff;">${senha}</b></li>
      <li>Pronto! Sua conta com <b>1 a 2 bilhões de tokens</b> está liberada para criar vídeos, imagens e agentes!</li>
    </ol>
    <div style="background:rgba(245,158,11,0.1);border-left:4px solid #f59e0b;padding:12px;margin-top:16px;border-radius:4px;font-size:13px;color:#fde68a;">
      ⚠️ <b>Importante:</b> Não clique em "Entrar com Google". Use estritamente o e-mail e a senha fornecidos.
    </div>
    `
  );
}

// 2. Procedimento Gemini Pro / Google Flow (18 Meses)
function emailFlowAiPro({ link }) {
  const linkAtivacao = link || WHATSAPP_URL;
  return emailWrapper(
    "⭐ Seu Google AI Pro + Flow (18 Meses) Está Pronto!",
    `
    <p style="color:#cbd5e1;font-size:15px;line-height:1.7;">Pagamento confirmado! O seu plano de <b>18 meses do Google AI Pro + Google Flow</b> já pode ser ativado na sua própria Conta Google.</p>
    
    <div style="background:#090a10;border:1px solid #282d49;border-radius:12px;padding:20px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 12px;font-size:13px;color:#818cf8;font-weight:bold;text-transform:uppercase;">Seu Link Exclusivo de Ativação:</p>
      <a href="${linkAtivacao}" style="display:inline-block;background:linear-gradient(135deg,#4f46e5,#9333ea);color:#fff;font-weight:bold;padding:14px 28px;border-radius:10px;text-decoration:none;font-size:15px;">👉 Ativar Meu Google AI Pro Agora</a>
      <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;word-break:break-all;">${linkAtivacao}</p>
    </div>

    <h3 style="color:#fff;font-size:16px;margin:24px 0 12px;">📋 Passo a Passo de Ativação:</h3>
    <ol style="color:#cbd5e1;font-size:14px;line-height:2;padding-left:20px;">
      <li>Abra o navegador onde você já está conectado no seu <b>Gmail / Conta Google</b>.</li>
      <li>Clique no botão acima ou abra o link exclusivo de ativação.</li>
      <li>Na página oficial do Google One, clique em <b>Ativar Plano</b> ou <b>Aceitar</b>.</li>
      <li>Pronto! O Gemini Advanced e o Google Flow estarão liberados na sua conta por 18 meses.</li>
    </ol>
    
    <p style="font-size:13px;color:#94a3b8;margin-top:16px;">
      🎬 <b>Vídeo explicativo:</b> Assista ao tutorial rápido de ativação <a href="${YOUTUBE_TUTORIAL_FLOW}" style="color:#38bdf8;">clicando aqui</a>.<br>
      🔒 <b>Segurança total:</b> Ativação 100% oficial diretamente na sua conta, sem compartilhar senha!
    </p>
    `
  );
}

// 3. Procedimento Super Duolingo (1 Ano)
function emailSuperDuolingo({ link }) {
  const linkConvite = link || WHATSAPP_URL;
  return emailWrapper(
    "🦉 Seu Super Duolingo (1 Ano) Está Liberado!",
    `
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

module.exports = {
  sendEmail,
  emailMuseIa,
  emailFlowAiPro,
  emailSuperDuolingo,
};
