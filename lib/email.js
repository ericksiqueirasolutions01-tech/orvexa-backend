// Envio de e-mail via Resend + templates de entrega por produto.
const { WHATSAPP_URL, YOUTUBE_TUTORIAL_FLOW } = require("./products");

async function sendEmail(to, subject, html) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY não configurado.");
  const from = process.env.FROM_EMAIL || "Orvexa Digital <acesso@seudominio.com>";

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

function shellHtml(title, bodyHtml) {
  return `
  <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0b0b14;color:#fff;padding:32px;border-radius:12px">
    <h1 style="font-size:24px;margin:0 0 8px">${title}</h1>
    ${bodyHtml}
    <p style="color:#9a9ab0;font-size:13px;margin-top:24px">Precisa de ajuda? Responda este e-mail ou chame no WhatsApp: <a href="${WHATSAPP_URL}" style="color:#4f7cff">${WHATSAPP_URL}</a></p>
  </div>`;
}

function emailMuseIa({ login, senha }) {
  return shellHtml(
    "🚀 Seu acesso à <span style='background:linear-gradient(90deg,#4f7cff,#a855f7);-webkit-background-clip:text;background-clip:text;color:transparent'>MUSE IA</span> chegou!",
    `
    <p style="color:#c9c9d6;font-size:15px">Pagamento confirmado. Abaixo estão o <b style="color:#fff">e-mail da conta</b>, a <b style="color:#fff">senha</b> e o passo a passo de acesso.</p>
    <div style="background:#151524;border:1px solid #2a2a44;border-radius:10px;padding:20px;margin:20px 0">
      <p style="margin:0 0 8px;font-size:14px;color:#9a9ab0">E-MAIL DA CONTA</p>
      <p style="margin:0 0 16px;font-size:20px;font-weight:bold;letter-spacing:1px">${login}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#9a9ab0">SENHA</p>
      <p style="margin:0;font-size:20px;font-weight:bold;letter-spacing:1px">${senha}</p>
    </div>
    <h2 style="font-size:18px;margin:24px 0 12px">🔐 Modo de Acesso</h2>
    <ol style="color:#c9c9d6;font-size:15px;line-height:1.9">
      <li>Abra o <b style="color:#fff">navegador</b> (Chrome, Edge ou outro).</li>
      <li>Para evitar conflitos com outras contas, certifique-se de que o navegador <b style="color:#fff">não esteja conectado a nenhuma conta Google</b>, ou use aba anônima.</li>
      <li>Acesse: <a href="https://muse.ai/" style="color:#4f7cff">https://muse.ai/</a></li>
      <li>Clique na opção de <b style="color:#fff">entrar com e-mail</b>.</li>
      <li>Informe o <b style="color:#fff">e-mail recebido</b>.</li>
      <li>Em seguida, selecione <b style="color:#fff">Entrar com senha</b>.</li>
      <li>Digite a <b style="color:#fff">senha recebida</b> e conclua o acesso.</li>
    </ol>
    <p style="color:#ffb020;font-size:14px;margin-top:16px">⚠️ <b>Importante:</b> utilize exatamente o e-mail e a senha fornecidos para o acesso. Não selecione "Entrar com Google" ou outra conta.</p>
    <p style="color:#9a9ab0;font-size:13px">💡 Guarde este e-mail em um lugar seguro. Não compartilhe seu acesso.</p>`
  );
}

function emailFlowAiPro() {
  return shellHtml(
    "🎬 Seu <span style='background:linear-gradient(90deg,#4f7cff,#a855f7);-webkit-background-clip:text;background-clip:text;color:transparent'>Google AI Pro + Flow</span> — 18 meses",
    `
    <p style="color:#c9c9d6;font-size:15px">Pagamento confirmado. Você garantiu <b style="color:#fff">18 meses de Google AI Pro</b> com <b style="color:#fff">1.000 créditos mensais</b> no Google Flow.</p>
    <h2 style="font-size:18px;margin:24px 0 12px">📋 Como ativar (passo a passo)</h2>
    <ol style="color:#c9c9d6;font-size:15px;line-height:1.9">
      <li>Assista ao vídeo tutorial de ativação: <a href="${YOUTUBE_TUTORIAL_FLOW}" style="color:#4f7cff">ver como ativar</a>.</li>
      <li>Chame nosso atendimento no WhatsApp para receber seu <b style="color:#fff">link de ativação</b>: <a href="${WHATSAPP_URL}" style="color:#4f7cff">abrir WhatsApp</a>.</li>
      <li>Entre na <b style="color:#fff">sua própria Conta Google</b> (não pedimos sua senha em nenhum momento).</li>
      <li>Conclua a ativação pelo link e aproveite os 18 meses.</li>
    </ol>
    <p style="color:#9a9ab0;font-size:13px">🔒 Ativação 100% na sua conta. Nenhuma senha compartilhada.</p>`
  );
}

function emailSuperDuolingo() {
  return shellHtml(
    "🦉 Seu <span style='background:linear-gradient(90deg,#4f7cff,#a855f7);-webkit-background-clip:text;background-clip:text;color:transparent'>Super Duolingo</span> — 1 ano",
    `
    <p style="color:#c9c9d6;font-size:15px">Pagamento confirmado. Seu plano anual do Super Duolingo está liberado.</p>
    <h2 style="font-size:18px;margin:24px 0 12px">📋 Como ativar (passo a passo)</h2>
    <ol style="color:#c9c9d6;font-size:15px;line-height:1.9">
      <li>Chame nosso atendimento no WhatsApp para receber seu <b style="color:#fff">convite de ativação</b>: <a href="${WHATSAPP_URL}" style="color:#4f7cff">abrir WhatsApp</a>.</li>
      <li>Aceite o convite com a sua conta do Duolingo.</li>
      <li>Pronto! 1 ano de Super Duolingo liberado.</li>
    </ol>`
  );
}

module.exports = { sendEmail, emailMuseIa, emailFlowAiPro, emailSuperDuolingo };
