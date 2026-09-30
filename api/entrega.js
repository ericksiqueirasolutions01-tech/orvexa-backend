// GET /api/entrega?pagamento=aprovado&produto=flow-ai-pro
// A aba "Seu produto está aqui" — para onde a InfinitePay manda o cliente
// depois do pagamento (botão "Continuar").
const { PRODUCTS, SITE_URL, WHATSAPP_URL, YOUTUBE_TUTORIAL_FLOW } = require("../lib/products");

function deliveryStepsHtml(produto) {
  if (produto === "flow-ai-pro") {
    return `
      <ol style="text-align:left;color:#c9c9d6;font-size:15px;line-height:2;max-width:460px;margin:0 auto">
        <li>Assista ao <a href="${YOUTUBE_TUTORIAL_FLOW}" style="color:#4f7cff">vídeo de ativação</a>.</li>
        <li>Chame no <a href="${WHATSAPP_URL}" style="color:#4f7cff">WhatsApp</a> e receba seu link de ativação.</li>
        <li>Ative na <b style="color:#fff">sua Conta Google</b> — sem compartilhar senha.</li>
      </ol>`;
  }
  if (produto === "muse-ia") {
    return `
    <p style="color:#c9c9d6;font-size:15px;line-height:1.8">Seu <b style="color:#fff">e-mail da conta e senha</b> foram enviados para o seu e-mail.<br>Não achou? Verifique a caixa de spam.</p>
    <h2 style="font-size:18px;margin:24px 0 12px">🔐 Modo de Acesso</h2>
    <ol style="text-align:left;color:#c9c9d6;font-size:15px;line-height:1.9;max-width:460px;margin:0 auto">
      <li>Abra o <b style="color:#fff">navegador</b> (Chrome, Edge ou outro).</li>
      <li>Certifique-se de que o navegador <b style="color:#fff">não esteja conectado a nenhuma conta Google</b>, ou use aba anônima.</li>
      <li>Acesse: <a href="https://muse.ai/" style="color:#4f7cff">https://muse.ai/</a></li>
      <li>Clique em <b style="color:#fff">entrar com e-mail</b>.</li>
      <li>Informe o <b style="color:#fff">e-mail recebido</b>.</li>
      <li>Selecione <b style="color:#fff">Entrar com senha</b>.</li>
      <li>Digite a <b style="color:#fff">senha recebida</b> e conclua o acesso.</li>
    </ol>
    <p style="color:#ffb020;font-size:14px;margin-top:16px">⚠️ <b>Importante:</b> utilize exatamente o e-mail e a senha fornecidos. Não selecione "Entrar com Google" ou outra conta.</p>`;
  }
  if (produto === "super-duolingo") {
    return `
      <ol style="text-align:left;color:#c9c9d6;font-size:15px;line-height:2;max-width:460px;margin:0 auto">
        <li>Chame no <a href="${WHATSAPP_URL}" style="color:#4f7cff">WhatsApp</a> e receba seu convite.</li>
        <li>Aceite o convite com sua conta do Duolingo. Pronto!</li>
      </ol>`;
  }
  return "";
}

module.exports = async function handler(req, res) {
  const status = req.query.pagamento;
  const produtoKey = req.query.produto;

  const titles = {
    aprovado: "✅ Pagamento aprovado!",
    erro: "❌ Pagamento não concluído",
    pendente: "⏳ Pagamento pendente",
  };
  const messages = {
    aprovado: `<b style="color:#fff">Seu produto está aqui 🎉</b><br><br>${deliveryStepsHtml(produtoKey)}`,
    erro: "O pagamento não foi concluído. Volte ao site e tente novamente.",
    pendente:
      "Estamos aguardando a confirmação do pagamento.<br>Assim que for aprovado, esta página libera seu acesso.",
  };

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Seu produto está aqui</title></head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0b0b14;color:#fff;font-family:Arial,sans-serif;padding:24px">
<div style="max-width:560px;text-align:center;background:#151524;border:1px solid #2a2a44;border-radius:16px;padding:40px 32px;box-shadow:0 20px 40px rgba(0,0,0,0.6)">
<h1 style="font-size:24px;margin:0 0 16px">${titles[status] || "🚀 Obrigado!"}</h1>
<p style="color:#c9c9d6;font-size:16px;line-height:1.7">${messages[status] || "Obrigado pelo seu interesse."}</p>
<div style="margin-top:24px">
  <a href="${WHATSAPP_URL}" target="_blank" style="display:inline-block;background:#25d366;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:bold;font-size:15px;box-shadow:0 8px 20px rgba(37,211,102,0.3)">
    💬 Chamar no WhatsApp para Suporte / Ativação
  </a>
</div>
${SITE_URL ? `<p style="margin-top:24px"><a href="${SITE_URL}" style="color:#4f7cff;font-size:14px;text-decoration:none">← Voltar ao site da loja</a></p>` : ""}
</div></body></html>`);
};
